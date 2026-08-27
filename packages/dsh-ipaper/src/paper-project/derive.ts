import type {
  PaperEdge,
  PaperGraphPage,
  PaperHistoryPage,
  PaperLensState,
  PaperNode,
  PaperNodeBase,
  EventAttributes,
  PaperProjectOverview,
  PaperProjectSnapshot,
  PaperRelatedPage,
  PaperStateInput,
  PaperStateResult,
} from './types.js'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

interface CursorValue {
  readonly revision: number
  readonly offset: number
}

function encodeCursor(value: CursorValue): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

function decodeCursor(cursor: string | undefined, revision: number): number {
  if (cursor === undefined) return 0
  let value: unknown
  try {
    value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
  } catch {
    throw new Error('invalid paper state cursor')
  }
  if (typeof value !== 'object' || value === null) throw new Error('invalid paper state cursor')
  const candidate = value as Partial<CursorValue>
  if (candidate.revision !== revision) throw new Error('paper state cursor is stale; request the view again without a cursor')
  if (!Number.isSafeInteger(candidate.offset) || (candidate.offset ?? -1) < 0) throw new Error('invalid paper state cursor')
  return candidate.offset as number
}

function pageLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(`paper state limit must be an integer from 1 to ${String(MAX_LIMIT)}`)
  }
  return limit
}

function nextCursor(revision: number, offset: number, count: number, total: number): string | undefined {
  const next = offset + count
  return next < total ? encodeCursor({ revision, offset: next }) : undefined
}

function sortNodes(nodes: readonly PaperNode[]): PaperNode[] {
  return [...nodes].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
}

function sortEdges(edges: readonly PaperEdge[]): PaperEdge[] {
  return [...edges].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
}

function eventNode(node: PaperNode): node is PaperNodeBase<'event', EventAttributes> {
  return node.kind === 'event'
}

function countBy(values: readonly string[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1
  return counts
}

function edgeExists(
  edges: readonly PaperEdge[],
  kind: PaperEdge['kind'],
  nodeId: string,
  direction: 'incoming' | 'outgoing',
): boolean {
  return edges.some(edge => edge.kind === kind && (direction === 'incoming' ? edge.targetId : edge.sourceId) === nodeId)
}

function lens(status: PaperLensState['status'], nodeIds: readonly string[]): PaperLensState {
  return { status, count: nodeIds.length, nodeIds }
}

export function deriveOverview(snapshot: PaperProjectSnapshot): PaperProjectOverview {
  const semantic = snapshot.nodes.filter(node => node.kind !== 'project' && node.kind !== 'event')
  const activeTaskIds = semantic.filter(node => node.kind === 'task' && node.status === 'active').map(node => node.id)
  const blockedTaskIds = semantic.filter(node => node.kind === 'task' && node.status === 'blocked').map(node => node.id)
  const unsupportedClaimIds = semantic
    .filter(node => node.kind === 'claim' && node.status !== 'rejected' && !edgeExists(snapshot.edges, 'supports', node.id, 'incoming'))
    .map(node => node.id)
  const contestedClaimIds = semantic.filter(node => node.kind === 'claim' && node.status === 'contested').map(node => node.id)
  const openReviewIds = semantic.filter(node => node.kind === 'review' && node.status === 'open').map(node => node.id)
  const unverifiedSourceIds = semantic
    .filter(node => node.kind === 'source' && node.status !== 'verified' && node.status !== 'rejected')
    .map(node => node.id)

  const integrityGaps: { code: string; nodeId: string; message: string }[] = []
  for (const nodeId of unsupportedClaimIds) integrityGaps.push({ code: 'unsupported-claim', nodeId, message: `Claim '${nodeId}' has no supporting evidence.` })
  for (const node of semantic) {
    if (node.kind === 'evidence' && node.status === 'unverified') {
      integrityGaps.push({ code: 'unverified-evidence', nodeId: node.id, message: `Evidence '${node.id}' remains unverified.` })
    }
    if (node.kind === 'artifact' && node.status === 'ready') {
      const badCitation = snapshot.edges
        .filter(edge => edge.kind === 'cites' && edge.sourceId === node.id)
        .map(edge => snapshot.nodes.find(candidate => candidate.id === edge.targetId))
        .find(candidate => candidate?.kind === 'source' && candidate.status !== 'verified')
      if (badCitation !== undefined) {
        integrityGaps.push({ code: 'ready-artifact-unverified-source', nodeId: node.id, message: `Ready artifact '${node.id}' cites unverified source '${badCitation.id}'.` })
      }
    }
  }

  const framingIds = semantic.filter(node => (
    (node.kind === 'objective' && node.status === 'accepted')
    || (node.kind === 'requirement' && node.status === 'open')
  ) && !edgeExists(snapshot.edges, 'addresses', node.id, 'incoming')).map(node => node.id)
  const researchIds = semantic.filter(node => (
    (node.kind === 'task' && node.status === 'active' && node.attributes.taskType === 'research')
    || (node.kind === 'source' && node.status !== 'verified' && node.status !== 'rejected')
    || (node.kind === 'evidence' && node.status === 'unverified')
  )).map(node => node.id)
  const argumentIds = [...new Set([...unsupportedClaimIds, ...contestedClaimIds])]
  const productionIds = semantic.filter(node => node.kind === 'artifact' && ['planned', 'draft', 'review'].includes(node.status)).map(node => node.id)
  const validationIds = [...new Set([...openReviewIds, ...integrityGaps.map(gap => gap.nodeId)])]

  return {
    view: 'overview',
    projectId: snapshot.projectId,
    workspaceId: snapshot.workspaceId,
    revision: snapshot.revision,
    countsByKind: countBy(semantic.map(node => node.kind)),
    countsByStatus: countBy(semantic.map(node => `${node.kind}:${node.status}`)),
    activeTaskIds,
    blockedTaskIds,
    unsupportedClaimIds,
    contestedClaimIds,
    openReviewIds,
    unverifiedSourceIds,
    integrityGaps,
    lenses: {
      framing: lens(framingIds.length > 0 ? 'needs-attention' : 'clear', framingIds),
      research: lens(researchIds.length > 0 ? 'active' : 'clear', researchIds),
      argument: lens(argumentIds.length > 0 ? 'needs-attention' : 'clear', argumentIds),
      production: lens(productionIds.length > 0 ? 'active' : 'clear', productionIds),
      validation: lens(validationIds.length > 0 ? 'needs-attention' : 'clear', validationIds),
    },
  }
}

function filteredNodes(snapshot: PaperProjectSnapshot, input: PaperStateInput): PaperNode[] {
  const kinds = input.kinds === undefined ? undefined : new Set(input.kinds)
  const statuses = input.statuses === undefined ? undefined : new Set(input.statuses)
  const query = input.query?.trim().toLocaleLowerCase()
  return sortNodes(snapshot.nodes.filter(node => {
    if (node.kind === 'event' && kinds === undefined) return false
    if (kinds !== undefined && !kinds.has(node.kind)) return false
    if (statuses !== undefined && !statuses.has(node.status)) return false
    if (query !== undefined && query !== '') {
      const haystack = `${node.id}\n${node.title}\n${node.summary}`.toLocaleLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  }))
}

export function deriveGraph(snapshot: PaperProjectSnapshot, input: PaperStateInput): PaperGraphPage {
  const limit = pageLimit(input.limit)
  const offset = decodeCursor(input.cursor, snapshot.revision)
  const allNodes = filteredNodes(snapshot, input)
  const nodes = allNodes.slice(offset, offset + limit)
  const allIds = new Set(allNodes.map(node => node.id))
  const pageIds = new Set(nodes.map(node => node.id))
  const edges = sortEdges(snapshot.edges.filter(edge => (
    allIds.has(edge.sourceId)
    && allIds.has(edge.targetId)
    && (pageIds.has(edge.sourceId) || pageIds.has(edge.targetId))
  )))
  const cursor = nextCursor(snapshot.revision, offset, nodes.length, allNodes.length)
  return {
    view: 'graph',
    projectId: snapshot.projectId,
    workspaceId: snapshot.workspaceId,
    revision: snapshot.revision,
    nodes,
    edges,
    ...(cursor === undefined ? {} : { cursor }),
  }
}

export function deriveRelated(snapshot: PaperProjectSnapshot, input: PaperStateInput): PaperRelatedPage {
  if (input.nodeId === undefined) throw new Error("paper state view 'related' requires nodeId")
  const node = snapshot.nodes.find(candidate => candidate.id === input.nodeId)
  if (node === undefined) throw new Error(`paper node '${input.nodeId}' does not exist`)
  const allEdges = sortEdges(snapshot.edges.filter(edge => edge.sourceId === node.id || edge.targetId === node.id))
  const limit = pageLimit(input.limit)
  const offset = decodeCursor(input.cursor, snapshot.revision)
  const page = allEdges.slice(offset, offset + limit)
  const incoming = page.filter(edge => edge.targetId === node.id)
  const outgoing = page.filter(edge => edge.sourceId === node.id)
  const neighborIds = new Set(page.map(edge => edge.sourceId === node.id ? edge.targetId : edge.sourceId))
  const neighbors = sortNodes(snapshot.nodes.filter(candidate => neighborIds.has(candidate.id)))
  const cursor = nextCursor(snapshot.revision, offset, page.length, allEdges.length)
  return {
    view: 'related',
    projectId: snapshot.projectId,
    workspaceId: snapshot.workspaceId,
    revision: snapshot.revision,
    node,
    incoming,
    outgoing,
    neighbors,
    ...(cursor === undefined ? {} : { cursor }),
  }
}

export function deriveHistory(snapshot: PaperProjectSnapshot, input: PaperStateInput): PaperHistoryPage {
  let events = [...snapshot.nodes.filter(eventNode)]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
  if (input.nodeId !== undefined) {
    const eventIds = new Set(snapshot.edges
      .filter(edge => edge.kind === 'affects' && edge.targetId === input.nodeId)
      .map(edge => edge.sourceId))
    events = events.filter(event => eventIds.has(event.id))
  }
  const limit = pageLimit(input.limit)
  const offset = decodeCursor(input.cursor, snapshot.revision)
  const page = events.slice(offset, offset + limit)
  const pageIds = new Set(page.map(event => event.id))
  const affects = sortEdges(snapshot.edges.filter(edge => edge.kind === 'affects' && pageIds.has(edge.sourceId)))
  const cursor = nextCursor(snapshot.revision, offset, page.length, events.length)
  return {
    view: 'history',
    projectId: snapshot.projectId,
    workspaceId: snapshot.workspaceId,
    revision: snapshot.revision,
    events: page,
    affects,
    ...(cursor === undefined ? {} : { cursor }),
  }
}

export function derivePaperState(snapshot: PaperProjectSnapshot, input: PaperStateInput = {}): PaperStateResult {
  switch (input.view ?? 'overview') {
    case 'overview': return deriveOverview(snapshot)
    case 'graph': return deriveGraph(snapshot, input)
    case 'related': return deriveRelated(snapshot, input)
    case 'history': return deriveHistory(snapshot, input)
  }
}
