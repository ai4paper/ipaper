/** IPaper's workspace-scoped view in the upstream conversation navigation. */
import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionHandle, SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { PaperStatusView, type PaperStatusViewProps } from './PaperStatusView.tsx'
import { PaperProjectPanel, PaperProjectIcon } from './PaperProjectPanel.tsx'
import { PAPER_PROJECT_STYLES } from './styles.ts'

export const inject = ['slots', 'sessions', 'workspaces', 'connection', 'layout']

export function apply(ctx: Context): void {
  const connection = ctx.get('connection') as ConnectionHandle
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = '@ai4paper/dsh-ipaper/ui-paper-project'
    style.textContent = PAPER_PROJECT_STYLES
    document.head.append(style)
    return () => { style.remove() }
  }, 'ipaper.paperProjectStyles')

  const sessions = {
    getSnapshot: () => ctx.sessions.list.getSnapshot(),
    subscribe: (listener: () => void) => ctx.sessions.list.subscribe(listener),
  }
  const workspaces = {
    getSnapshot: () => ctx.workspaces.list.getSnapshot(),
    subscribe: (listener: () => void) => ctx.workspaces.list.subscribe(listener),
  }
  const startFindProblem = async (sessionId: SessionId): Promise<void> => {
    const binding = ctx.sessions.binding(sessionId)
    if (binding === undefined) throw new Error('This session is no longer available. Return to chat and select a session.')
    const result = await binding.session.prompt([{ type: 'text', text: '/find-the-problem' }], 'queue')
    if (!result.ok) throw new Error(result.error.message)
    ctx.layout.selectPanel(null)
  }
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: 'ipaper.paper-status',
    inject: () => ({ rpc: connection.rpc, sessions, workspaces, startFindProblem, back: () => ctx.layout.selectPanel(null) }),
  }, PaperProjectPanel))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: 'ipaper.paper-status', label: 'Paper status', order: 20,
  }, PaperProjectIcon))
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'paper-project',
    order: 20,
    label: 'Paper status',
    inject: (sessionId: SessionId): PaperStatusViewProps => ({
      sessionId, rpc: connection.rpc, sessions, workspaces,
      startFindProblem: () => startFindProblem(sessionId),
    }),
  }, PaperStatusView))
}
