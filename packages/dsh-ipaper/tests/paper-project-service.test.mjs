import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolvePaperWorkspace } from '../lib/paper-project/index.js'

function snapshot(workspaceId) {
  return {
    projectId: `paper-${workspaceId}`,
    workspaceId,
    revision: 0,
    root: { id: 'project-1' },
    nodes: [],
    edges: [],
  }
}

function context({ liveAgents = [], persistedHeaders = [] } = {}) {
  return {
    agents: { list: () => liveAgents },
    sessionPersistence: { list: async () => persistedHeaders },
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
