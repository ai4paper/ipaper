import { PaperProjectGraph } from './PaperProjectGraph.tsx'
import type { PaperProjectStatus } from './types.ts'

export interface ProjectGraphViewProps {
  readonly status: PaperProjectStatus
}

export function ProjectGraphView({ status }: ProjectGraphViewProps) {
  const nodes = status.snapshot.nodes.filter(node => node.kind !== 'project' && node.kind !== 'event')
  const nodeIds = new Set(nodes.map(node => node.id))
  const edges = status.snapshot.edges.filter(edge => nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId))
  return <PaperProjectGraph nodes={nodes} edges={edges} />
}
