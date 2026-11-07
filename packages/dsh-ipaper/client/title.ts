/** Product title projection for the exact supported DSH 0.2.2-rc.1 shell. */
import type { Context } from '@deepseek-ai/cordis'
import type { PanelInfo } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import { useEffect } from 'react'

interface TitleProps {
  // rc.1's published selector-hook alias references a dev-only client-store
  // dependency. Describe the consumed public call signature with owner types.
  useSessions: <Selected>(selector: (state: SessionListState) => Selected) => Selected
  usePanelInfo: <Selected>(selector: (info: PanelInfo) => Selected) => Selected
}

/** Preserve upstream session-title selection while supplying IPaper's product name. */
export function IPaperDocumentTitle({ useSessions, usePanelInfo }: TitleProps): null {
  const showSessionTitle = usePanelInfo((info) => info.activePanelId === null)
  const title = useSessions((state) => {
    const current = Object.values(state.byId).find((session) => (session.retainedBy.mainView ?? 0) > 0)
    return showSessionTitle ? current?.title : undefined
  })

  useEffect(() => {
    let active = true
    // The pinned shell also writes in a passive effect. Wait until the shared
    // effect flush finishes, irrespective of slot sibling effect ordering.
    // Both occupants select the same public mirrors and mount with AppFrame.
    queueMicrotask(() => {
      if (active) document.title = title === undefined ? 'IPaper' : `${title} — IPaper`
    })
    return () => { active = false }
  }, [title])
  return null
}

/** Add a persistent root-scoped title occupant without replacing any shell surface. */
export function apply(ctx: Context): void {
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'ipaper.document-title',
  }, IPaperDocumentTitle))
}
