/** IPaper's workspace-scoped Paper Project status plane. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ClientConnectionRpc, SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@isomoes/dsh-web-ui/client/ui-conversation/client'
import type {} from '@isomoes/dsh-web-ui/client/ui-sidebar/client'
import { PaperProjectSidebar } from './PaperProjectSidebar.tsx'
import { PaperStatusView } from './PaperStatusView.tsx'
import { PAPER_PROJECT_STYLES } from './styles.ts'
import { togglePaperStatusView } from './toggle.ts'

export const inject = ['slots', 'sessions', 'workspaces', 'connection', 'commandUi']

interface PaperStatusCommandUi {
  registerAction(action: {
    readonly id: string
    readonly title: () => string
    readonly category: () => string
    readonly keybind: string
    readonly disabled: () => boolean
    readonly run: () => void
  }): () => void
}

export function apply(ctx: ClientContext): void {
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
  const rpc = (ctx as ClientContext & { connection: { readonly rpc: ClientConnectionRpc } }).connection.rpc
  const commandUi = (ctx as ClientContext & { commandUi: PaperStatusCommandUi }).commandUi
  const startFindProblem = (sessionId: SessionId): void => {
    const binding = ctx.sessions.binding(sessionId)
    if (binding === undefined) return
    togglePaperStatusView()
    void binding.session.prompt([{ type: 'text', text: '/find-the-problem' }], 'queue')
  }

  ctx.effect(() => commandUi.registerAction({
    id: 'view.paper-status',
    title: () => 'Toggle Paper status',
    category: () => 'View',
    keybind: 'mod+shift+p',
    disabled: () => sessions.getSnapshot().current === undefined,
    run: () => { togglePaperStatusView() },
  }), 'ipaper.paperStatusShortcut')

  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.inject('conversation.view', function* () {
      yield ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'paper-project-status',
        order: 10,
      }, (props: { readonly wide: boolean }) => (
        <PaperProjectSidebar wide={props.wide} sessions={sessions} />
      ))
      yield ctx.slots.register({
        name: 'conversation.view',
        id: 'paper-project',
        order: 20,
        label: 'Paper status',
      }, (props: { readonly sessionId: SessionId }) => (
        <PaperStatusView sessionId={props.sessionId} rpc={rpc} sessions={sessions} workspaces={workspaces} startFindProblem={startFindProblem} />
      ))
    }))
}
