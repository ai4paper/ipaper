import type { ElementDefinition } from 'cytoscape'
import type { PaperEdge, PaperNode } from '../../../src/paper-project/types.js'

export function graphElements(nodes: readonly PaperNode[], edges: readonly PaperEdge[]): ElementDefinition[] {
  const nodeIds = new Set(nodes.map(node => node.id))
  return [
    ...nodes.map(node => ({
      group: 'nodes' as const,
      data: { id: node.id, label: node.title, kind: node.kind, status: node.status },
      classes: `${node.kind} status-${node.status}`,
    })),
    ...edges.filter(edge => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId)).map(edge => ({
      group: 'edges' as const,
      data: { id: edge.id, source: edge.sourceId, target: edge.targetId, kind: edge.kind },
    })),
  ]
}
