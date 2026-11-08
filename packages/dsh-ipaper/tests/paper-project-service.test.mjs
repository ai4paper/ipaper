import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PaperProjectService, resolvePaperWorkspace } from '../lib/paper-project/index.js'

function snapshot(workspaceId) {
  return {
    project: { projectId: `paper-${workspaceId}`, workspaceId, revision: 0 },
    records: [],
    history: [],
  }
}

function context({ liveAgents = [], persistedHeaders = [], onList = () => {} } = {}) {
  return {
    agents: { list: () => liveAgents },
    sessionPersistence: {
      async list(options) {
        onList(options)
        options.signal?.throwIfAborted()
        return persistedHeaders.map(header => ({ header, revision: 'saved-revision', eventCount: 5 }))
      },
    },
    get(name) {
      return name === 'sessionPersistence' ? this.sessionPersistence : undefined
    },
    workspaceRegistry: {
      async resolveByPath(path) {
        return path === '/paper' ? { id: 'workspace-a', path: '/paper' } : undefined
      },
    },
  }
}

test('resolves two root sessions to one workspace-owned project', async () => {
  const ensured = []
  const ensure = async (workspaceId, workspacePath, sessionId) => {
    ensured.push({ workspaceId, workspacePath, sessionId })
    return snapshot(workspaceId)
  }
  for (const id of ['root-a', 'root-b']) {
    const agent = { id, session: { header: { id, cwd: '/paper' } } }
    const resolved = await resolvePaperWorkspace(context(), agent, ensure)
    assert.equal(resolved.workspaceId, 'workspace-a')
    assert.equal(resolved.caller.origin, 'root')
  }
  assert.deepEqual(ensured.map(item => item.sessionId), ['root-a', 'root-b'])
})

test('resolves a subagent without cwd through live parent lineage', async () => {
  const parent = { id: 'root-a', session: { header: { id: 'root-a', cwd: '/paper' } } }
  const child = {
    id: 'child-a',
    session: { header: { id: 'child-a', parentSession: 'root-a', origin: 'subagent' } },
  }
  const resolved = await resolvePaperWorkspace(
    context({ liveAgents: [parent] }),
    child,
    async workspaceId => snapshot(workspaceId),
  )
  assert.equal(resolved.workspaceId, 'workspace-a')
  assert.deepEqual(resolved.caller, { sessionId: 'child-a', origin: 'subagent' })
})

test('falls back to durable parent headers and rejects broken lineage', async () => {
  const child = {
    id: 'child-a',
    session: { header: { id: 'child-a', parentSession: 'root-a', origin: 'subagent' } },
  }
  const resolved = await resolvePaperWorkspace(
    context({ persistedHeaders: [{ id: 'root-a', cwd: '/paper' }] }),
    child,
    async workspaceId => snapshot(workspaceId),
  )
  assert.equal(resolved.workspacePath, '/paper')

  await assert.rejects(
    resolvePaperWorkspace(context(), child, async workspaceId => snapshot(workspaceId)),
    /cannot resolve parent session/,
  )
})

test('rejects sessions outside the registered workspace boundary', async () => {
  const agent = { id: 'root-a', session: { header: { id: 'root-a', cwd: '/other' } } }
  await assert.rejects(
    resolvePaperWorkspace(context(), agent, async workspaceId => snapshot(workspaceId)),
    /not registered as a DSH workspace/,
  )
})

test('resolves nested saved parent snapshots with cancellation and preserves the child caller', async () => {
  const signal = new AbortController().signal
  const listings = []
  const ctx = context({
    persistedHeaders: [
      { id: 'unrelated', cwd: '/other' },
      { id: 'parent', parentSession: 'root-a', origin: 'subagent' },
      { id: 'root-a', cwd: '/paper' },
    ],
    onList: options => listings.push(options),
  })
  const child = { id: 'child', session: { header: { id: 'child', parentSession: 'parent', origin: 'subagent' } } }
  const resolved = await resolvePaperWorkspace(ctx, child, async (workspaceId, path, sessionId) => {
    assert.equal(path, '/paper')
    assert.equal(sessionId, 'child')
    return snapshot(workspaceId)
  }, signal)
  assert.equal(resolved.workspaceId, 'workspace-a')
  assert.deepEqual(resolved.caller, { sessionId: 'child', origin: 'subagent' })
  assert.deepEqual(listings, [{ signal }, { signal }])
})

test('rejects cyclic saved lineage and cancellation without creating a paper project', async () => {
  const child = { id: 'child', session: { header: { id: 'child', parentSession: 'parent', origin: 'subagent' } } }
  const ensure = async () => assert.fail('invalid lineage must not create a project')
  await assert.rejects(resolvePaperWorkspace(context({ persistedHeaders: [{ id: 'parent', parentSession: 'parent' }] }), child, ensure), /lineage repeats/)
  const controller = new AbortController()
  const ctx = context({ onList: () => controller.abort(new Error('cancel saved lookup')) })
  await assert.rejects(resolvePaperWorkspace(ctx, child, ensure, controller.signal), /cancel saved lookup/)
})

test('parent lineage also enforces append-only caller identity when origin is omitted', async () => {
  const agent = { id: 'child', session: { header: { id: 'child', cwd: '/paper', parentSession: 'root' } } }
  const resolved = await resolvePaperWorkspace(context(), agent, async workspaceId => snapshot(workspaceId))
  assert.equal(resolved.caller.origin, 'subagent')
})

test('browser first read creates memory only for a registered workspace using its trusted path', async () => {
  const calls = []
  const receiver = {
    ctx: { workspaceRegistry: { list: () => [{ id: 'a', path: '/registered' }] } },
    async ensurePaperProject(...args) { calls.push(args); return snapshot('a') },
  }
  assert.equal(await PaperProjectService.prototype.statusSnapshot.call(receiver, 'missing'), undefined)
  const result = await PaperProjectService.prototype.statusSnapshot.call(receiver, 'a')
  assert.equal(result.project.workspaceId, 'a')
  assert.deepEqual(calls, [['a', '/registered', 'host']])
})
