import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createPaperProjectRpcHandler,
  IPAPER_STATUS_ENDPOINT,
  paperProjectStatus,
} from '../lib/paper-project-remote.js'

const snapshot = {
  projectId: 'paper-workspace-a',
  workspaceId: 'workspace-a',
  revision: 2,
  root: {
    id: 'paper-workspace-a',
    projectId: 'paper-workspace-a',
    kind: 'project',
    title: 'Paper Project',
    summary: '',
    status: 'active',
    attributes: { workspacePath: '/paper' },
    version: 1,
    createdBySessionId: 'session-a',
    updatedBySessionId: 'session-a',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  nodes: [],
  edges: [],
}

const source = {
  getSnapshot(workspaceId) {
    return workspaceId === 'workspace-a' ? snapshot : undefined
  },
}

test('projects one workspace snapshot into a dashboard status payload', () => {
  const status = paperProjectStatus(source, 'workspace-a')
  assert.equal(status.snapshot, snapshot)
  assert.equal(status.overview.workspaceId, 'workspace-a')
  assert.equal(status.overview.revision, 2)
  assert.equal(status.overview.lenses.framing.status, 'clear')
  assert.equal(paperProjectStatus(source, 'missing'), null)
})

test('serves only the typed paper-project status endpoint', async () => {
  const handler = createPaperProjectRpcHandler(source)
  const result = await handler(IPAPER_STATUS_ENDPOINT, { workspaceId: 'workspace-a' })
  assert.equal(result.ok, true)
  assert.equal(result.value.overview.projectId, 'paper-workspace-a')

  const missingId = await handler(IPAPER_STATUS_ENDPOINT, {})
  assert.equal(missingId.ok, false)
  assert.equal(missingId.error.code, 'bad-request')

  const unknown = await handler('other', { workspaceId: 'workspace-a' })
  assert.equal(unknown.ok, false)
})
