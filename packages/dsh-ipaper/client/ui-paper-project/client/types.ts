import type { WorkspaceView } from '@deepseek-ai/dsh-client-connection/client'
import type { PaperProblemMap, PaperProjectOverview, PaperProjectSnapshot } from '../../../src/paper-project/types.js'

export const TABS = ['questions', 'overview', 'research', 'manuscript', 'activity'] as const
export const LENSES = ['framing', 'research', 'argument', 'production', 'validation'] as const

export type Tab = typeof TABS[number]
export type Lens = typeof LENSES[number]

export interface PaperProjectStatus {
  readonly snapshot: PaperProjectSnapshot
  readonly overview: PaperProjectOverview
  readonly problemMap: PaperProblemMap
}

export interface Observable<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

export interface WorkspaceState {
  readonly items: readonly WorkspaceView[]
}
