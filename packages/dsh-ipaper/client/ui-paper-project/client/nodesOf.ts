import type { PaperNode, PaperNodeKind } from '../../../src/paper-project/types.js'
import type { PaperProjectStatus } from './types.ts'

export function nodesOf(status: PaperProjectStatus, kinds: readonly PaperNodeKind[]): PaperNode[] {
  const accepted = new Set(kinds)
  return status.snapshot.nodes.filter(node => accepted.has(node.kind)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
