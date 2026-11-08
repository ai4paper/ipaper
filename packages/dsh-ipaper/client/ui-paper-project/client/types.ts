import type { WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
export type { PaperProjectStatus } from '../../../src/paper-project/memory-view-types.js'

export interface Observable<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

export interface WorkspaceState {
  readonly items: readonly WorkspaceView[]
}
