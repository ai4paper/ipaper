import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceState } from './types.ts'

export function workspaceForSession(sessionId: SessionId, sessions: SessionListState, workspaces: WorkspaceState): WorkspaceView | undefined {
  let cursor: SessionId | undefined = sessionId
  const seen = new Set<SessionId>()
  while (cursor !== undefined && !seen.has(cursor)) {
    const current: SessionId = cursor
    seen.add(current)
    const workspace = workspaces.items.find(item => item.sessionIds.includes(current))
    if (workspace !== undefined) return workspace
    cursor = sessions.byId[current]?.parentId
  }
  return undefined
}
