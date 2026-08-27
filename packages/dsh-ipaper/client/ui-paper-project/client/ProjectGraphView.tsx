import { PaperProjectGraph } from './PaperProjectGraph.tsx'
import type { PaperProjectStatus } from './types.ts'

export interface ProjectGraphViewProps {
  readonly status: PaperProjectStatus
}

export function ProjectGraphView({ status }: ProjectGraphViewProps) {
  return <PaperProjectGraph nodes={status.snapshot.nodes} edges={status.snapshot.edges} />
}
