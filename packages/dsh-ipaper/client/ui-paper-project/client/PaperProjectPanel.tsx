import { useSyncExternalStore } from 'react'
import { Empty } from './Empty.tsx'
import { PaperStatusView, type PaperStatusViewProps } from './PaperStatusView.tsx'

export interface PaperProjectPanelProps extends Omit<PaperStatusViewProps, 'sessionId'> {
  readonly back: () => void
}

/** Root panel keeps the upstream main-session selection, including unsent drafts. */
export function PaperProjectPanel({ back, ...props }: PaperProjectPanelProps) {
  const state = useSyncExternalStore(props.sessions.subscribe, props.sessions.getSnapshot, props.sessions.getSnapshot)
  const session = Object.values(state.byId).find(item => (item.retainedBy.mainView ?? 0) > 0)
  return <section className="ipaper-project-panel">
    <header><button type="button" onClick={back}>Back to chat</button><strong>Paper status</strong></header>
    {session === undefined
      ? <Empty title="Choose a paper workspace" copy="Return to chat and select a workspace to begin the guided workflow." />
      : <PaperStatusView {...props} sessionId={session.id} />}
  </section>
}

export function PaperProjectIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
    <path d="M6.5 3.5h7l4 4v13h-11v-17Z M13.5 3.5v4h4 M9 12h6 M9 15.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
}
