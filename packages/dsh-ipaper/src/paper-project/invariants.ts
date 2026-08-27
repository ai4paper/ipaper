import { isAbsolute, relative, resolve } from 'node:path'
import type {
  PaperEdge,
  PaperNode,
  PaperNodeKind,
  PaperProjectRecord,
} from './types.js'

export class PaperGraphInvariantError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaperGraphInvariantError'
  }
}

function reject(message: string): never {
  throw new PaperGraphInvariantError(message)
}

function isSemantic(node: PaperNode): boolean {
  return node.kind !== 'project' && node.kind !== 'event'
}

function assertKinds(
  edge: PaperEdge,
  source: PaperNode,
  target: PaperNode,
  sourceKinds: readonly PaperNodeKind[],
  targetKinds: readonly PaperNodeKind[],
): void {
  if (!sourceKinds.includes(source.kind) || !targetKinds.includes(target.kind)) {
    reject(`edge '${edge.id}' has invalid ${source.kind} -> ${target.kind} endpoints for '${edge.kind}'`)
  }
}

function assertEdgeVocabulary(edge: PaperEdge, source: PaperNode, target: PaperNode): void {
  switch (edge.kind) {
    case 'contains':
      assertKinds(edge, source, target, ['project', 'artifact'], ['objective', 'requirement', 'task', 'source', 'evidence', 'claim', 'artifact', 'review', 'decision', 'note'])
      return
    case 'addresses':
      assertKinds(edge, source, target, ['task', 'claim', 'artifact', 'decision'], ['objective', 'requirement'])
      return
    case 'depends_on':
      if (!isSemantic(source) || !isSemantic(target)) reject(`edge '${edge.id}' must connect semantic nodes`)
      return
    case 'produces':
      assertKinds(edge, source, target, ['task'], ['source', 'evidence', 'claim', 'artifact', 'review', 'note'])
      return
    case 'derived_from':
      assertKinds(edge, source, target, ['evidence', 'claim', 'artifact'], ['source', 'artifact'])
      return
    case 'supports':
    case 'contradicts':
      assertKinds(edge, source, target, ['evidence'], ['claim'])
      return
    case 'cites':
      assertKinds(edge, source, target, ['claim', 'artifact'], ['source'])
      return
    case 'reviews':
      assertKinds(edge, source, target, ['review'], ['claim', 'artifact'])
      return
    case 'resolves':
      assertKinds(edge, source, target, ['decision', 'artifact'], ['review', 'objective', 'requirement'])
      return
    case 'supersedes':
      assertKinds(edge, source, target, ['artifact', 'decision', 'claim'], ['artifact', 'decision', 'claim'])
      if (source.kind !== target.kind) reject(`edge '${edge.id}' must supersede a node of the same kind`)
      return
    case 'affects':
      assertKinds(edge, source, target, ['event'], ['objective', 'requirement', 'task', 'source', 'evidence', 'claim', 'artifact', 'review', 'decision', 'note'])
  }
}

function assertAcyclic(edges: readonly PaperEdge[], kind: 'contains' | 'supersedes'): void {
  const outgoing = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.kind !== kind) continue
    const targets = outgoing.get(edge.sourceId)
    if (targets === undefined) outgoing.set(edge.sourceId, [edge.targetId])
    else targets.push(edge.targetId)
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (nodeId: string): void => {
    if (visiting.has(nodeId)) reject(`'${kind}' edges form a cycle at '${nodeId}'`)
    if (visited.has(nodeId)) return
    visiting.add(nodeId)
    for (const targetId of outgoing.get(nodeId) ?? []) visit(targetId)
    visiting.delete(nodeId)
    visited.add(nodeId)
  }
  for (const nodeId of outgoing.keys()) visit(nodeId)
}

function assertReachable(rootNodeId: string, nodes: readonly PaperNode[], edges: readonly PaperEdge[]): void {
  const outgoing = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.kind === 'affects') continue
    const targets = outgoing.get(edge.sourceId)
    if (targets === undefined) outgoing.set(edge.sourceId, [edge.targetId])
    else targets.push(edge.targetId)
  }
  const reached = new Set([rootNodeId])
  const queue = [rootNodeId]
  for (let index = 0; index < queue.length; index += 1) {
    const nodeId = queue[index]
    if (nodeId === undefined) continue
    for (const targetId of outgoing.get(nodeId) ?? []) {
      if (reached.has(targetId)) continue
      reached.add(targetId)
      queue.push(targetId)
    }
  }
  const unreachable = nodes.find(node => isSemantic(node) && !reached.has(node.id))
  if (unreachable !== undefined) reject(`semantic node '${unreachable.id}' is not reachable from '${rootNodeId}'`)
}

function isInspectableOrigin(node: PaperNode | undefined): boolean {
  if (node?.kind === 'source') return node.status === 'inspected' || node.status === 'verified'
  if (node?.kind === 'artifact') {
    return node.status !== 'planned' && (node.attributes.path === undefined || node.attributes.pathStatus === 'exists')
  }
  return false
}

function hasVerifiedSourceIdentity(node: Extract<PaperNode, { kind: 'source' }>): boolean {
  const verification = node.attributes.verification
  if (verification?.method === 'doi' && node.attributes.doi === undefined) return false
  if (verification?.method === 'url' && node.attributes.url === undefined) return false
  return node.attributes.doi !== undefined || node.attributes.url !== undefined || verification?.method === 'manual'
}

function assertScholarlyIntegrity(nodes: readonly PaperNode[], edges: readonly PaperEdge[]): void {
  const byId = new Map(nodes.map(node => [node.id, node]))
  for (const edge of edges) {
    if (edge.kind !== 'supports') continue
    const evidence = byId.get(edge.sourceId)
    if (evidence?.kind !== 'evidence') reject(`support edge '${edge.id}' has invalid evidence`)
    const origins = edges
      .filter(candidate => candidate.kind === 'derived_from' && candidate.sourceId === evidence.id)
      .map(candidate => byId.get(candidate.targetId))
    if (!origins.some(isInspectableOrigin)) {
      reject(`supporting evidence '${evidence.id}' has no inspected source or inspectable artifact origin`)
    }
  }
  for (const node of nodes) {
    if (node.kind === 'source' && node.status === 'verified') {
      if (!node.attributes.bibliographicMetadataVerified || !hasVerifiedSourceIdentity(node)) {
        reject(`verified source '${node.id}' requires verified DOI, URL, or an explicit manual verification record`)
      }
    }
    if (node.kind === 'claim' && node.status === 'supported') {
      const supports = edges.filter(edge => edge.kind === 'supports' && edge.targetId === node.id)
      if (supports.length === 0) reject(`supported claim '${node.id}' has no supporting evidence`)
    }
    if (node.kind === 'artifact' && node.attributes.path !== undefined) {
      if (node.attributes.pathStatus === undefined || node.attributes.pathCheckedAt === undefined) {
        reject(`path-bearing artifact '${node.id}' has no host path check`)
      }
    }
    if (node.kind === 'artifact' && node.status === 'ready') {
      const dependencies = edges
        .filter(edge => edge.kind === 'depends_on' && edge.sourceId === node.id)
        .map(edge => byId.get(edge.targetId))
      const badDependency = dependencies.find(dependency => dependency?.kind === 'artifact' && dependency.status === 'superseded')
      const acceptedOverride = dependencies.some(dependency => dependency?.kind === 'decision' && dependency.status === 'accepted')
      if (badDependency !== undefined && !acceptedOverride) {
        reject(`ready artifact '${node.id}' depends on superseded artifact '${badDependency.id}' without an accepted decision dependency`)
      }
    }
    if (node.kind === 'review' && node.status === 'resolved') {
      const resolution = edges.find(edge => edge.kind === 'resolves' && edge.targetId === node.id)
      if (resolution === undefined) reject(`resolved review '${node.id}' has no resolving decision or artifact`)
    }
  }
}

export function canonicalArtifactPath(workspacePath: string, artifactPath: string): string {
  if (isAbsolute(artifactPath)) reject(`artifact path '${artifactPath}' must be workspace-relative`)
  const canonical = resolve(workspacePath, artifactPath)
  const fromWorkspace = relative(workspacePath, canonical)
  if (fromWorkspace === '..' || fromWorkspace.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(fromWorkspace)) {
    reject(`artifact path '${artifactPath}' escapes workspace '${workspacePath}'`)
  }
  return fromWorkspace === '' ? '.' : fromWorkspace
}

export function validatePaperGraph(
  project: PaperProjectRecord,
  nodes: readonly PaperNode[],
  edges: readonly PaperEdge[],
): void {
  const byId = new Map<string, PaperNode>()
  let roots = 0
  for (const node of nodes) {
    if (node.projectId !== project.projectId) reject(`node '${node.id}' belongs to another project`)
    if (byId.has(node.id)) reject(`project repeats node '${node.id}'`)
    byId.set(node.id, node)
    if (node.kind === 'project') {
      roots += 1
      if (node.id !== project.rootNodeId) reject(`project root '${node.id}' does not match '${project.rootNodeId}'`)
    }
    if (node.kind === 'artifact' && node.attributes.path !== undefined) {
      canonicalArtifactPath(project.workspacePath, node.attributes.path)
    }
  }
  if (roots !== 1) reject(`project '${project.projectId}' must have exactly one project root`)

  const edgeIds = new Set<string>()
  const edgeSignatures = new Set<string>()
  for (const edge of edges) {
    if (edge.projectId !== project.projectId) reject(`edge '${edge.id}' belongs to another project`)
    if (edgeIds.has(edge.id)) reject(`project repeats edge '${edge.id}'`)
    edgeIds.add(edge.id)
    const source = byId.get(edge.sourceId)
    const target = byId.get(edge.targetId)
    if (source === undefined || target === undefined) reject(`edge '${edge.id}' references a missing node`)
    if (source.id === target.id && edge.kind === 'supersedes') reject(`node '${source.id}' cannot supersede itself`)
    const signature = `${edge.sourceId}\u0000${edge.kind}\u0000${edge.targetId}`
    if (edgeSignatures.has(signature)) reject(`duplicate '${edge.kind}' edge from '${edge.sourceId}' to '${edge.targetId}'`)
    edgeSignatures.add(signature)
    assertEdgeVocabulary(edge, source, target)
  }

  assertAcyclic(edges, 'contains')
  assertAcyclic(edges, 'supersedes')
  assertReachable(project.rootNodeId, nodes, edges)
  assertScholarlyIntegrity(nodes, edges)
}
