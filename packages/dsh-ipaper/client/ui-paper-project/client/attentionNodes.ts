import type { PaperNode } from '../../../src/paper-project/types.js'
import type { PaperProjectStatus } from './types.ts'

export function attentionNodes(status: PaperProjectStatus | null | undefined): PaperNode[] {
  if (status == null) return []
  const ids = new Set([
    ...status.overview.blockedTaskIds,
    ...status.overview.unsupportedClaimIds,
    ...status.overview.contestedClaimIds,
    ...status.overview.openReviewIds,
    ...status.overview.unverifiedSourceIds,
    ...status.overview.integrityGaps.map(gap => gap.nodeId),
  ])
  return status.snapshot.nodes.filter(node => ids.has(node.id))
}
