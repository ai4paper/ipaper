import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { MemoryStore, deriveMemoryState, checkMemoryPath } from '../lib/paper-project/index.js'
import { PaperProjectStore } from '../lib/paper-project/legacy/store.js'

class Table {
  values = new Map()
  fail = false
  get(key) { return structuredClone(this.values.get(key)) }
  entries() { return structuredClone(this.values).entries() }
  async put(key, value) {
    if (this.fail) throw new Error('interrupted write')
    this.values.set(key, structuredClone(value))
  }
}
class Facility {
  domains = new Map()
  async open(spec) {
    if (!this.domains.has(spec.name)) {
      const tables = new Map(Object.keys(spec.tables).map(name => [name, new Table()]))
      this.domains.set(spec.name, { table: name => tables.get(name), async close() {} })
    }
    return this.domains.get(spec.name)
  }
}
const root = { sessionId: 'root', origin: 'root' }
const child = { sessionId: 'child', origin: 'subagent' }
const note = (ref, extra = {}) => ({ ref, kind: 'note', title: ref, text: 'Durable context', ...extra })
async function fixture() {
  const facility = new Facility()
  const store = await MemoryStore.open(facility)
  await store.ensurePaperProject('a', '/nonexistent-ipaper-workspace/a', 'root')
  return { facility, store }
}

test('shares one empty memory, resolves aliases, attributes subagent appends and detects concurrent stale updates', async () => {
  const { store } = await fixture()
  assert.deepEqual((await store.ensurePaperProject('a', '/nonexistent-ipaper-workspace/a', 'other')).records, [])
  const created = await store.record('a', child, { records: [
    { ref: 'paper', kind: 'source', title: 'Paper', text: 'Read section 2', source: { inspection: 'inspected', inspectedContent: 'Section 2' } },
    { ref: 'quote', kind: 'finding', title: 'Quotation', text: 'Exact text', quotation: true,
      references: [{ kind: 'origin', recordId: 'paper', locator: 'Section 2, p. 3' }] },
  ] })
  const snapshot = store.getSnapshot('a')
  assert.equal(snapshot.records[1].references[0].recordId, created.created.paper)
  assert.equal(snapshot.records[1].createdBySessionId, 'child')
  assert.equal(snapshot.history[0].origin, 'subagent')
  await assert.rejects(store.record('a', child, { updates: [{ id: created.created.paper, expectedVersion: 1, title: 'Changed' }] }), /append/)
  const calls = await Promise.allSettled(['First', 'Second'].map(title => store.record('a', root, {
    updates: [{ id: created.created.paper, expectedVersion: 1, title }],
  })))
  assert.equal(calls.filter(result => result.status === 'fulfilled').length, 1)
  assert.match(calls.find(result => result.status === 'rejected').reason.message, /version conflict/)
  assert.equal(store.getSnapshot('a').project.revision, 2)
  await store.close()
})

test('rejects malformed references, quotations, aliases and graph payloads without committing', async () => {
  const { store } = await fixture()
  await store.ensurePaperProject('b', '/nonexistent-ipaper-workspace/b', 'root')
  const other = await store.record('b', root, { records: [note('other')] })
  const bad = [
    { nodes: [] },
    { records: [note('same'), note('same')] },
    { records: [note('memory-1')] },
    { records: [note('foreign', { references: [{ kind: 'related', recordId: other.created.other }] })] },
    { records: [{ ref: 'quote', kind: 'finding', title: 'Quote', text: 'No origin', quotation: true }] },
    { records: [note('file', { references: [{ kind: 'file', path: '../outside' }] })] },
    { records: [note('bad', { source: { inspection: 'discovered' } })] },
    { records: [{ ref: 'paper', kind: 'source', title: 'Paper', text: '', source: { inspection: 'inspected' } }] },
    { records: [note('origin', { references: [{ kind: 'origin', recordId: 'origin' }] })] },
  ]
  for (const input of bad) await assert.rejects(store.record('a', root, input))
  assert.equal(store.getSnapshot('a').project.revision, 0)
  assert.deepEqual(store.getSnapshot('a').records, [])
  await store.close()
})

test('atomic write failure leaves committed snapshots intact and survives restart', async () => {
  const { store, facility } = await fixture()
  const result = await store.record('a', root, { records: [note('one')] })
  const table = facility.domains.get('ipaper_memory').table('projects')
  table.fail = true
  await assert.rejects(store.record('a', root, { updates: [{ id: result.created.one, expectedVersion: 1, text: 'Lost' }], records: [note('two')] }), /interrupted/)
  assert.equal(store.getSnapshot('a').records[0].text, 'Durable context')
  assert.equal(store.getSnapshot('a').history.length, 1)
  await store.close()
  table.fail = false
  const restarted = await MemoryStore.open(facility)
  assert.equal(restarted.getSnapshot('a').project.revision, 1)
  assert.equal(restarted.getSnapshot('a').records.length, 1)
  await restarted.close()
})

test('bounded summary/search/record/history preserve archive history and reject stale cursors', async () => {
  const { store } = await fixture()
  const result = await store.record('a', root, { records: Array.from({ length: 25 }, (_, i) => note(`n${i}`, { unresolved: true })) })
  const snapshot = store.getSnapshot('a')
  const summary = await deriveMemoryState(snapshot)
  assert.equal(summary.recent.length, 10)
  assert.equal(summary.unresolved.length, 10)
  assert.equal(summary.unresolvedCount, 25)
  const first = await deriveMemoryState(snapshot, { view: 'search', limit: 3 })
  const next = await deriveMemoryState(snapshot, { view: 'search', limit: 3, cursor: first.cursor })
  assert.equal(next.records.length, 3)
  assert.notEqual(first.records[0].id, next.records[0].id)
  await assert.rejects(deriveMemoryState(snapshot, { view: 'search', limit: 3, query: 'other', cursor: first.cursor }), /cursor/)
  await store.record('a', root, { updates: [{ id: result.created.n0, expectedVersion: 1, archived: true }] })
  const current = store.getSnapshot('a')
  assert.equal((await deriveMemoryState(current)).counts.note, 24)
  await assert.rejects(deriveMemoryState(current, { view: 'search', limit: 3, cursor: first.cursor }), /stale/)
  const detail = await deriveMemoryState(current, { view: 'record', recordId: result.created.n0 })
  assert.equal(detail.record.archived, true)
  const history = await deriveMemoryState(current, { view: 'history', recordId: result.created.n0, limit: 1 })
  assert.equal(history.changes[0].before[0].archived, false)
  assert.equal(history.changes[0].after[0].archived, true)
  assert.ok(history.cursor)
  await assert.rejects(deriveMemoryState(current, { view: 'graph' }), /Legacy/)
  await store.close()
})

test('checks symlink containment including missing descendants and reports current file existence', async t => {
  const directory = await mkdtemp('/tmp/opencode/ipaper-memory-')
  t.after(() => rm(directory, { recursive: true, force: true }))
  const workspace = join(directory, 'workspace')
  const outside = join(directory, 'outside')
  await mkdir(workspace)
  await mkdir(outside)
  await symlink(outside, join(workspace, 'escape'))
  await writeFile(join(workspace, 'draft.md'), '# Draft')
  assert.equal(await checkMemoryPath(workspace, 'draft.md'), 'exists')
  assert.equal(await checkMemoryPath(workspace, 'missing.md'), 'missing')
  await assert.rejects(checkMemoryPath(workspace, 'escape/missing.md'), /inside/)
  await assert.rejects(checkMemoryPath(workspace, '../outside/missing.md'), /inside/)
  await symlink('../outside-missing', join(workspace, 'dangling-external'))
  await assert.rejects(checkMemoryPath(workspace, 'dangling-external/file.md'), /inside/)
  await symlink('missing-directory', join(workspace, 'dangling-internal'))
  assert.equal(await checkMemoryPath(workspace, 'dangling-internal/file.md'), 'missing')
  await symlink('dangling-internal', join(workspace, 'nested-internal'))
  assert.equal(await checkMemoryPath(workspace, 'nested-internal/file.md'), 'missing')
  await symlink('dangling-external', join(workspace, 'nested-external'))
  await assert.rejects(checkMemoryPath(workspace, 'nested-external/file.md'), /inside/)
  await symlink('cycle-b', join(workspace, 'cycle-a'))
  await symlink('cycle-a', join(workspace, 'cycle-b'))
  await assert.rejects(checkMemoryPath(workspace, 'cycle-a/file.md'), /loop/)
  await symlink(workspace, join(directory, 'workspace-alias'))
  assert.equal(await checkMemoryPath(join(directory, 'workspace-alias'), 'draft.md'), 'exists')
  assert.equal(await checkMemoryPath(join(directory, 'workspace-alias'), 'nested-internal/file.md'), 'missing')
  await assert.rejects(checkMemoryPath(join(directory, 'workspace-alias'), 'dangling-external/file.md'), /inside/)
  const { store } = await fixture()
  await store.ensurePaperProject('files', workspace, 'root')
  const result = await store.record('files', root, { records: [note('draft', { references: [{ kind: 'file', path: 'draft.md' }] })] })
  const input = { view: 'record', recordId: result.created.draft }
  assert.equal((await deriveMemoryState(store.getSnapshot('files'), input)).record.references[0].pathStatus, 'exists')
  await rm(join(workspace, 'draft.md'))
  assert.equal((await deriveMemoryState(store.getSnapshot('files'), input)).record.references[0].pathStatus, 'missing')
  await store.close()
})

test('migration is restart-safe and retains graph, events, metadata, file and semantic references', async () => {
  const facility = new Facility()
  const legacy = await PaperProjectStore.open(facility)
  await legacy.ensurePaperProject('a', '/nonexistent-ipaper-workspace/a', 'root')
  await legacy.record('a', root, { operationSummary: 'Old work', nodes: [
    { ref: 'source', kind: 'source', title: 'Paper', status: 'inspected' },
    { ref: 'finding', kind: 'evidence', title: 'Observation', attributes: { evidenceType: 'quotation', verbatim: true, locator: 'p. 2' } },
    { ref: 'task', kind: 'task', title: 'Work', status: 'active' },
    { ref: 'file', kind: 'artifact', title: 'Draft', attributes: { artifactType: 'section', path: 'draft.md' } },
    { ref: 'objective', kind: 'objective', title: 'Question' },
    { ref: 'requirement', kind: 'requirement', title: 'Deadline', attributes: { dueAt: '2027-01-01T00:00:00.000Z' } },
    { ref: 'claim', kind: 'claim', title: 'Hypothesis', attributes: { inferenceType: 'inferred' } },
    { ref: 'review', kind: 'review', title: 'Criticism' },
    { ref: 'decision', kind: 'decision', title: 'Choice', attributes: { rationale: 'Use the smaller dataset' } },
    { ref: 'note', kind: 'note', title: 'Old note' },
  ], edges: [{ source: 'finding', kind: 'derived_from', target: 'source' }, { source: 'task', kind: 'produces', target: 'file' }] })
  const graph = legacy.getSnapshot('a')
  await legacy.close()
  // Fail the destination write: v1 remains recoverable and migration can retry.
  const { memoryDomainSpec } = await import('../lib/paper-project/memory-spec.js')
  const destination = await facility.open(memoryDomainSpec)
  destination.table('projects').fail = true
  await assert.rejects(MemoryStore.open(facility), /interrupted/)
  destination.table('projects').fail = false
  const store = await MemoryStore.open(facility)
  const migrated = store.getSnapshot('a')
  assert.deepEqual(migrated.legacySnapshot.graph, graph)
  assert.equal(migrated.records.length, 10)
  for (const record of migrated.records) assert.deepEqual(record.legacy, graph.nodes.find(node => node.id === record.legacy.id))
  assert.match(migrated.records.find(record => record.legacy.id === 'decision-1').text, /Use the smaller dataset/)
  assert.match(migrated.records.find(record => record.legacy.id === 'claim-1').text, /inferred/)
  assert.equal(migrated.records.find(record => record.legacy.id === 'source-1').source.inspection, 'inspected')
  const source = migrated.records.find(record => record.legacy.id === 'source-1')
  assert.match(source.source.inspectedContent, /no description of inspected content was recorded/)
  assert.equal(source.legacy.summary, '')
  await store.record('a', root, { updates: [{ id: source.id, expectedVersion: 1, archived: true }] })
  await store.record('a', root, { updates: [{ id: source.id, expectedVersion: 2, title: 'Historical paper' }] })
  assert.equal(store.getSnapshot('a').records.find(record => record.id === source.id).source.inspection, 'inspected')
  assert.deepEqual(migrated.records.find(record => record.legacy.id === 'evidence-1').references, [{ kind: 'origin', recordId: 'paper-a:source-1', locator: 'p. 2' }])
  assert.equal(migrated.records.find(record => record.legacy.id === 'task-1').legacy.status, 'active')
  assert.equal(migrated.records.find(record => record.legacy.id === 'artifact-1').references[0].path, 'draft.md')
  assert.equal(migrated.records.find(record => record.legacy.id === 'task-1').references[0].explanation, 'produces')
  await store.record('a', root, { records: [note('new')] })
  await store.close()
  const restarted = await MemoryStore.open(facility)
  assert.equal(restarted.getSnapshot('a').records.length, 11)
  assert.deepEqual(restarted.getSnapshot('a').legacySnapshot, migrated.legacySnapshot)
  await restarted.close()
})

test('migration normalizes blank display values without losing legacy content or opaque identities', async () => {
  const facility = new Facility()
  const legacy = await PaperProjectStore.open(facility)
  await legacy.ensurePaperProject(' a ', '/nonexistent-ipaper-workspace/a ', ' ')
  await legacy.record(' a ', { ...root, sessionId: ' ' }, { operationSummary: 'Legacy whitespace', nodes: [
    { ref: 'note', kind: 'note', title: '   ' },
    { ref: 'source', kind: 'source', title: ' Paper ', status: 'inspected', summary: '  ', attributes: { citationKey: '  ', bibliographicMetadataVerified: false } },
    { ref: 'quote', kind: 'evidence', title: 'Quote', attributes: { evidenceType: 'quotation', verbatim: true, locator: '  ' } },
    { ref: 'artifact', kind: 'artifact', title: 'File' },
  ], edges: [{ source: 'quote', kind: 'derived_from', target: 'source' }] })
  // The persisted v1 schema permits blank paths even though its tool normalizes paths.
  const nodes = facility.domains.get('ipaper_project').table('nodes')
  for (const [key, value] of nodes.entries()) {
    if (value.kind === 'artifact') await nodes.put(key, { ...value, attributes: { ...value.attributes, path: '  ', pathStatus: 'missing', pathCheckedAt: value.updatedAt } })
  }
  await legacy.close()
  const store = await MemoryStore.open(facility)
  const snapshot = store.getSnapshot(' a ')
  assert.equal(snapshot.project.workspaceId, ' a ')
  assert.equal(snapshot.project.workspacePath, '/nonexistent-ipaper-workspace/a ')
  const note = snapshot.records.find(record => record.kind === 'note' && record.legacy.kind === 'note')
  assert.equal(note.title, 'Legacy note (note-1)')
  assert.equal(note.legacy.title, '   ')
  assert.equal(note.createdBySessionId, ' ')
  const source = snapshot.records.find(record => record.kind === 'source')
  assert.equal(source.title, 'Paper')
  assert.equal(source.source.citationKey, undefined)
  assert.equal(source.legacy.attributes.citationKey, '  ')
  assert.match(source.source.inspectedContent, /Migration did not inspect/)
  const quote = snapshot.records.find(record => record.kind === 'finding')
  assert.equal(quote.quotation, false)
  assert.equal(quote.references[0].locator, undefined)
  assert.equal(quote.legacy.attributes.locator, '  ')
  assert.equal(snapshot.records.find(record => record.legacy.kind === 'artifact').references.length, 0)
  await store.record(' a ', root, { updates: [{ id: source.id, expectedVersion: 1, archived: true }] })
  await store.record(' a ', root, { updates: [{ id: source.id, expectedVersion: 2, title: 'Updated' }] })
  await store.close()
  const reopened = await MemoryStore.open(facility)
  assert.deepEqual(reopened.getSnapshot(' a ').legacySnapshot, snapshot.legacySnapshot)
  await reopened.close()
})
