import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  PaperGraphInvariantError,
  PaperNodeVersionConflictError,
  PaperProjectStore,
  paperProjectDomainSpec,
} from '../lib/paper-project/index.js'

class MemoryTable {
  records = new Map()
  failPut

  get size() {
    return this.records.size
  }

  get(key) {
    return this.records.get(key)
  }

  entries() {
    return new Map(this.records).entries()
  }

  keys() {
    return new Map(this.records).keys()
  }

  async put(key, value) {
    if (this.failPut?.(key, value)) throw new Error(`injected put failure for ${key}`)
    this.records.set(key, structuredClone(value))
  }

  async delete(key) {
    return this.records.delete(key)
  }

  async update(key, transform) {
    const current = this.records.get(key)
    if (current === undefined) throw new Error(`missing key ${key}`)
    const next = transform(current)
    await this.put(key, next)
    return next
  }
}

class MemoryDomain {
  tables = new Map([
    ['projects', new MemoryTable()],
    ['nodes', new MemoryTable()],
    ['edges', new MemoryTable()],
  ])

  table(name) {
    const table = this.tables.get(name)
    if (table === undefined) throw new Error(`unknown table ${name}`)
    return table
  }

  async close() {}
}

class MemoryFacility {
  domain = new MemoryDomain()

  async open(spec) {
    assert.equal(spec.name, 'ipaper_project')
    assert.equal(spec.version, 1)
    assert.deepEqual(Object.keys(spec.tables), ['projects', 'nodes', 'edges'])
    return this.domain
  }
}

const caller = {
  sessionId: 'session-root',
  origin: 'root',
}

async function openProject() {
  const facility = new MemoryFacility()
  const store = await PaperProjectStore.open(facility)
  const initial = await store.ensurePaperProject('workspace-a', '/workspace/a', caller.sessionId)
  return { facility, store, initial }
}

test('declares the three-table v1 project domain with a backend-safe name', () => {
  assert.equal(paperProjectDomainSpec.name, 'ipaper_project')
  assert.equal(paperProjectDomainSpec.version, 1)
  assert.deepEqual(Object.keys(paperProjectDomainSpec.tables), ['projects', 'nodes', 'edges'])
})

test('creates one idempotent root and commits deterministic graph records', async () => {
  const { store, initial } = await openProject()
  assert.equal(initial.projectId, 'paper-workspace-a')
  assert.equal(initial.revision, 0)
  assert.equal(initial.root.id, 'project-1')
  assert.equal(initial.nodes.length, 1)

  const repeated = await store.ensurePaperProject('workspace-a', '/workspace/a', 'session-other')
  assert.equal(repeated.projectId, initial.projectId)
  assert.equal(repeated.nodes.length, 1)

  const result = await store.record('workspace-a', caller, {
    operationSummary: 'Frame the project',
    nodes: [
      { ref: 'objective', kind: 'objective', title: 'Research question', status: 'accepted' },
      { ref: 'task', kind: 'task', title: 'Review literature', status: 'active' },
    ],
    edges: [
      { source: 'task', kind: 'addresses', target: 'objective' },
    ],
  })

  assert.equal(result.revision, 1)
  assert.deepEqual(result.created, {
    objective: 'objective-1',
    task: 'task-1',
  })
  assert.equal(result.eventId, 'event-1')

  const snapshot = store.getSnapshot('workspace-a')
  assert.equal(snapshot.revision, 1)
  assert.equal(snapshot.nodes.length, 4)
  assert.ok(snapshot.edges.some(edge => edge.kind === 'addresses' && edge.sourceId === 'task-1' && edge.targetId === 'objective-1'))
  assert.ok(snapshot.edges.some(edge => edge.kind === 'contains' && edge.targetId === 'objective-1'))
  assert.ok(snapshot.edges.some(edge => edge.kind === 'contains' && edge.targetId === 'task-1'))
  assert.equal(snapshot.edges.filter(edge => edge.kind === 'affects').length, 2)
})

test('rejects stale versions and invalid scholarly graph transitions before staging', async () => {
  const { store } = await openProject()
  await store.record('workspace-a', caller, {
    operationSummary: 'Create a claim',
    nodes: [{ ref: 'claim', kind: 'claim', title: 'Proposed finding' }],
  })

  await assert.rejects(
    store.record('workspace-a', caller, {
      operationSummary: 'Stale edit',
      updates: [{ id: 'claim-1', expectedVersion: 9, title: 'Changed' }],
    }),
    PaperNodeVersionConflictError,
  )

  await assert.rejects(
    store.record('workspace-a', caller, {
      operationSummary: 'Unsupported transition',
      updates: [{ id: 'claim-1', expectedVersion: 1, status: 'supported' }],
    }),
    PaperGraphInvariantError,
  )
  assert.equal(store.getSnapshot('workspace-a').revision, 1)
})

test('enforces append-only task-scoped subagent checkpoints', async () => {
  const { store } = await openProject()
  await store.record('workspace-a', caller, {
    operationSummary: 'Delegate source inspection',
    nodes: [{ ref: 'task', kind: 'task', title: 'Inspect sources', status: 'active' }],
  })

  const subagent = { sessionId: 'session-worker', origin: 'subagent' }
  await assert.rejects(
    store.record('workspace-a', subagent, {
      operationSummary: 'Missing delegation',
      nodes: [{ ref: 'source', kind: 'source', title: 'Source' }],
    }),
    /require taskId/,
  )
  await assert.rejects(
    store.record('workspace-a', subagent, {
      operationSummary: 'Forbidden framing',
      taskId: 'task-1',
      nodes: [{ ref: 'objective', kind: 'objective', title: 'New objective' }],
    }),
    /cannot create 'objective'/,
  )

  await assert.rejects(
    store.record('workspace-a', subagent, {
      operationSummary: 'Forbidden claim promotion',
      taskId: 'task-1',
      nodes: [{ ref: 'claim', kind: 'claim', title: 'Claim', status: 'supported' }],
    }),
    /only with status 'proposed'/,
  )

  await store.record('workspace-a', subagent, {
    operationSummary: 'Checkpoint inspected source',
    taskId: 'task-1',
    nodes: [{ ref: 'source', kind: 'source', title: 'Inspected primary source', status: 'inspected' }],
  })
  const snapshot = store.getSnapshot('workspace-a')
  assert.ok(snapshot.edges.some(edge => edge.kind === 'produces' && edge.sourceId === 'task-1' && edge.targetId === 'source-1'))

  await assert.rejects(
    store.record('workspace-a', subagent, {
      operationSummary: 'Forbidden update',
      taskId: 'task-1',
      updates: [{ id: 'source-1', expectedVersion: 1, title: 'Changed' }],
    }),
    /cannot update/,
  )
})

test('records question discovery metadata and paper-to-question coverage', async () => {
  const { store } = await openProject()
  await store.record('workspace-a', caller, {
    operationSummary: 'Map one researched question',
    nodes: [
      {
        ref: 'question',
        kind: 'objective',
        title: 'Can smaller models verify citations?',
        attributes: {
          objectiveType: 'question',
          questionStage: 'gap',
          verificationStatus: 'pending',
          interest: 'high',
          novelty: 'unknown',
          feasibility: 'medium',
        },
      },
      {
        ref: 'paper',
        kind: 'source',
        title: 'Citation Verifier',
        status: 'inspected',
        attributes: {
          sourceType: 'paper',
          authors: ['Ada Author'],
          venue: 'ACL',
          shortlisted: true,
          searchProvenance: [{ provider: 'dblp', query: 'citation verifier', filters: '2024-2026', searchedAt: '2026-01-01T00:00:00.000Z' }],
          bibliographicMetadataVerified: false,
        },
      },
    ],
    edges: [{ source: 'paper', kind: 'addresses', target: 'question' }],
  })
  const snapshot = store.getSnapshot('workspace-a')
  const paper = snapshot.nodes.find(item => item.id === 'source-1')
  assert.deepEqual(paper.attributes.authors, ['Ada Author'])
  assert.equal(paper.attributes.searchProvenance[0].provider, 'dblp')
  assert.ok(snapshot.edges.some(item => item.kind === 'addresses' && item.sourceId === 'source-1' && item.targetId === 'objective-1'))
})

test('canonicalizes and host-checks artifact paths without implying existence', async () => {
  const { store } = await openProject()
  await store.record('workspace-a', caller, {
    operationSummary: 'Record draft artifact',
    nodes: [{
      ref: 'draft',
      kind: 'artifact',
      title: 'Draft section',
      attributes: { artifactType: 'section', path: 'sections/../draft.md' },
    }],
  })
  const artifact = store.getSnapshot('workspace-a').nodes.find(node => node.id === 'artifact-1')
  assert.equal(artifact.attributes.path, 'draft.md')
  assert.equal(artifact.attributes.pathStatus, 'missing')
  assert.match(artifact.attributes.pathCheckedAt, /Z$/)
  await assert.rejects(
    store.record('workspace-a', caller, {
      operationSummary: 'Escaping artifact',
      nodes: [{ ref: 'bad', kind: 'artifact', title: 'Bad', attributes: { artifactType: 'other', path: '../outside' } }],
    }),
    /escapes workspace/,
  )
})

test('records complete audit metadata and affected endpoints for edge-only batches', async () => {
  const { store } = await openProject()
  await store.record('workspace-a', caller, {
    operationSummary: 'Create work',
    nodes: [
      { ref: 'objective', kind: 'objective', title: 'Objective' },
      { ref: 'task', kind: 'task', title: 'Task' },
    ],
  })
  await store.record('workspace-a', caller, {
    operationSummary: 'Connect prerequisite',
    edges: [{ source: 'task-1', kind: 'depends_on', target: 'objective-1' }],
  })
  const snapshot = store.getSnapshot('workspace-a')
  const event = snapshot.nodes.find(node => node.id === 'event-2')
  assert.equal(event.attributes.callerSessionId, caller.sessionId)
  assert.equal(event.attributes.callerOrigin, 'root')
  assert.equal(event.attributes.committedRevision, 2)
  assert.match(event.attributes.committedAt, /Z$/)
  const affected = snapshot.edges
    .filter(edge => edge.kind === 'affects' && edge.sourceId === event.id)
    .map(edge => edge.targetId)
    .sort()
  assert.deepEqual(affected, ['objective-1', 'task-1'])
  assert.deepEqual(event.attributes.createdEdgeIds
    .map(id => snapshot.edges.find(edge => edge.id === id)?.kind)
    .sort(), ['affects', 'affects', 'depends_on'])
})

test('enforces verified-source identity and support provenance', async () => {
  const { store } = await openProject()
  await assert.rejects(
    store.record('workspace-a', caller, {
      operationSummary: 'Invalid verified source',
      nodes: [{
        ref: 'source',
        kind: 'source',
        title: 'Unidentified source',
        status: 'verified',
        attributes: { citationKey: 'unknown', bibliographicMetadataVerified: true },
      }],
    }),
    /verified DOI, URL, or an explicit manual verification record/,
  )
  await assert.rejects(
    store.record('workspace-a', caller, {
      operationSummary: 'Unsupported provenance',
      nodes: [
        { ref: 'source', kind: 'source', title: 'Discovered only', attributes: { bibliographicMetadataVerified: false } },
        { ref: 'evidence', kind: 'evidence', title: 'Evidence', attributes: { evidenceType: 'paraphrase', verbatim: false } },
        { ref: 'claim', kind: 'claim', title: 'Claim' },
      ],
      edges: [
        { source: 'evidence', kind: 'derived_from', target: 'source' },
        { source: 'evidence', kind: 'supports', target: 'claim' },
      ],
    }),
    /no inspected source or inspectable artifact origin/,
  )
})

test('rejects ready artifacts with superseded dependencies absent an accepted decision', async () => {
  const { store } = await openProject()
  await assert.rejects(
    store.record('workspace-a', caller, {
      operationSummary: 'Invalid ready dependency',
      nodes: [
        { ref: 'old', kind: 'artifact', title: 'Old draft', status: 'superseded', attributes: { artifactType: 'section' } },
        { ref: 'ready', kind: 'artifact', title: 'Ready draft', status: 'ready', attributes: { artifactType: 'section' } },
      ],
      edges: [{ source: 'ready', kind: 'depends_on', target: 'old' }],
    }),
    /depends on superseded artifact/,
  )
})

test('returns defensive snapshots that cannot mutate authoritative state', async () => {
  const { store } = await openProject()
  const snapshot = store.getSnapshot('workspace-a')
  snapshot.root.title = 'Corrupted'
  snapshot.nodes[0].attributes.workspacePath = '/other'
  snapshot.nodes.push({ id: 'fake' })
  const reread = store.getSnapshot('workspace-a')
  assert.equal(reread.root.title, 'Paper project')
  assert.equal(reread.root.attributes.workspacePath, '/workspace/a')
  assert.equal(reread.nodes.length, 1)
})

test('keeps failed partial writes hidden and rolls them forward on reopen', async () => {
  const { facility, store } = await openProject()
  const nodes = facility.domain.table('nodes')
  let failures = 2
  nodes.failPut = key => {
    if (!key.endsWith(':source-1') || failures === 0) return false
    failures -= 1
    return true
  }

  await assert.rejects(
    store.record('workspace-a', caller, {
      operationSummary: 'Record inspected source',
      nodes: [{
        ref: 'source',
        kind: 'source',
        title: 'Primary source',
        status: 'inspected',
      }],
    }),
    AggregateError,
  )
  assert.equal(store.getSnapshot('workspace-a').revision, 0)
  assert.equal(store.getSnapshot('workspace-a').nodes.length, 1)

  nodes.failPut = undefined
  await store.close()
  const recovered = await PaperProjectStore.open(facility)
  const snapshot = recovered.getSnapshot('workspace-a')
  assert.equal(snapshot.revision, 1)
  assert.ok(snapshot.nodes.some(node => node.id === 'source-1'))
  assert.ok(snapshot.nodes.some(node => node.id === 'event-1'))
})
