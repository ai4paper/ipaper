/** Browser-safe read contract; contains no host services or storage handles. */
export interface MemoryRecordSummary {
  readonly id: string
  readonly kind: 'source' | 'finding' | 'note'
  readonly title: string
  readonly text: string
  readonly version: number
  readonly archived: boolean
  readonly unresolved: boolean
  readonly updatedAt: string
}

export interface MemorySummary {
  readonly view: 'summary'
  readonly projectId: string
  readonly workspaceId: string
  readonly revision: number
  readonly counts: { readonly source: number; readonly finding: number; readonly note: number }
  readonly recent: readonly MemoryRecordSummary[]
  readonly unresolvedCount: number
  readonly unresolved: readonly MemoryRecordSummary[]
}

export interface PaperProjectStatus {
  readonly summary: MemorySummary
}
