import type { ElementDefinition } from 'cytoscape'
import type { PaperEdge, PaperNode } from '../../../src/paper-project/types.js'

export function graphElements(nodes: readonly PaperNode[], edges: readonly PaperEdge[]): ElementDefinition[] {
  const nodesById = new Map(nodes.map(node => [node.id, node]))
  const visibleEdges = edges.filter(edge => nodesById.has(edge.sourceId) && nodesById.has(edge.targetId))
  const nodesWithSemanticIncoming = new Set(visibleEdges
    .filter(edge => nodesById.get(edge.sourceId)?.kind !== 'project')
    .map(edge => edge.targetId))
  return [
    ...nodes.map(node => ({
      group: 'nodes' as const,
      data: { id: node.id, label: node.title, kind: node.kind, status: node.status },
      classes: `${node.kind} status-${node.status}`,
    })),
    ...visibleEdges.map(edge => ({
      group: 'edges' as const,
      data: { id: edge.id, source: edge.sourceId, target: edge.targetId, kind: edge.kind, label: edge.kind.replaceAll('_', ' ') },
      classes: [
        'edge-kind-' + edge.kind,
        nodesById.get(edge.sourceId)?.kind !== 'project' || !nodesWithSemanticIncoming.has(edge.targetId) ? 'layout-edge' : undefined,
      ].filter(Boolean).join(' '),
    })),
  ]
}
