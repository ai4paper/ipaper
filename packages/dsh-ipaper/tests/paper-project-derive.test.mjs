import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  deriveGraph,
  deriveHistory,
  deriveOverview,
  deriveRelated,
} from '../lib/paper-project/index.js'

const time = '2026-01-01T00:00:00.000Z'
const attributes = {
  project: { workspacePath: '/paper' },
  objective: {},
  task: { taskType: 'research' },
  claim: {},
  artifact: { artifactType: 'section' },
  review: { severity: 'major' },
  event: {
    operationSummary: 'Seed graph',
    callerSessionId: 'session-a',
    callerOrigin: 'root',
    committedAt: time,
    createdNodeIds: [],
    updatedNodes: [],
    createdEdgeIds: [],
    committedRevision: 1,
  },
}

function node(id, kind, status, title = id) {
  return {
    id,
    projectId: 'paper-a',
    kind,
    title,
    summary: '',
    status,
    attributes: attributes[kind],
    version: 1,
    createdBySessionId: 'session-a',
    updatedBySessionId: 'session-a',
    createdAt: time,
    updatedAt: time,
  }
}

function edge(id, kind, sourceId, targetId) {
  return {
    id,
    projectId: 'paper-a',
    kind,
    sourceId,
    targetId,
    createdBySessionId: 'session-a',
    createdAt: time,
  }
}

const nodes = [
  node('project-1', 'project', 'active'),
  node('objective-1', 'objective', 'accepted', 'Explain the result'),
  node('task-1', 'task', 'active'),
  node('claim-1', 'claim', 'proposed', 'Main finding'),
  node('artifact-1', 'artifact', 'draft'),
  node('review-1', 'review', 'open'),
  node('event-1', 'event', 'recorded'),
]
const edges = [
  edge('edge-1', 'contains', 'project-1', 'objective-1'),
  edge('edge-2', 'contains', 'project-1', 'task-1'),
  edge('edge-3', 'contains', 'project-1', 'claim-1'),
  edge('edge-4', 'contains', 'project-1', 'artifact-1'),
  edge('edge-5', 'contains', 'project-1', 'review-1'),
  edge('edge-6', 'reviews', 'review-1', 'claim-1'),
  edge('edge-7', 'affects', 'event-1', 'claim-1'),
]
const snapshot = {
  projectId: 'paper-a',
  workspaceId: 'workspace-a',
  revision: 1,
  root: nodes[0],
  nodes,
  edges,
}

test('derives overlapping process lenses and concrete integrity gaps', () => {
  const overview = deriveOverview(snapshot)
  assert.deepEqual(overview.activeTaskIds, ['task-1'])
  assert.deepEqual(overview.unsupportedClaimIds, ['claim-1'])
  assert.deepEqual(overview.openReviewIds, ['review-1'])
  assert.equal(overview.lenses.framing.status, 'needs-attention')
  assert.equal(overview.lenses.research.status, 'active')
  assert.equal(overview.lenses.argument.status, 'needs-attention')
  assert.equal(overview.lenses.production.status, 'active')
  assert.equal(overview.lenses.validation.status, 'needs-attention')
  assert.ok(overview.integrityGaps.some(gap => gap.code === 'unsupported-claim'))
  assert.equal('completionPercentage' in overview, false)
})

test('filters and paginates graph nodes with revision-bound cursors', () => {
  const first = deriveGraph(snapshot, { view: 'graph', limit: 2 })
  assert.equal(first.nodes.length, 2)
  assert.ok(first.cursor)
  const second = deriveGraph(snapshot, { view: 'graph', limit: 2, cursor: first.cursor })
  assert.equal(second.nodes.length, 2)
  const claims = deriveGraph(snapshot, { view: 'graph', kinds: ['claim'], query: 'main' })
  assert.deepEqual(claims.nodes.map(item => item.id), ['claim-1'])
  assert.equal(claims.nodes.some(item => item.kind === 'event'), false)
  assert.throws(() => deriveGraph({ ...snapshot, revision: 2 }, { view: 'graph', cursor: first.cursor }), /stale/)
})

test('derives bounded related neighborhoods and mutation history', () => {
  const related = deriveRelated(snapshot, { view: 'related', nodeId: 'claim-1' })
  assert.deepEqual(related.neighbors.map(item => item.id).sort(), ['event-1', 'project-1', 'review-1'])
  assert.ok(related.incoming.some(item => item.kind === 'reviews'))
  const history = deriveHistory(snapshot, { view: 'history', nodeId: 'claim-1' })
  assert.deepEqual(history.events.map(item => item.id), ['event-1'])
  assert.deepEqual(history.affects.map(item => item.id), ['edge-7'])
  assert.throws(() => deriveRelated(snapshot, { view: 'related' }), /requires nodeId/)
})
