import type { ClientConnectionRpc, SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import { useState, useSyncExternalStore } from 'react'
import { Empty } from './Empty.tsx'
import type { Observable, WorkspaceState } from './types.ts'
import { usePaperProjectStatus } from './usePaperProjectStatus.ts'
import { workspaceForSession } from './workspaceForSession.ts'

export interface PaperStatusViewProps {
  readonly sessionId: SessionId
  readonly rpc: ClientConnectionRpc
  readonly sessions: Observable<SessionListState>
  readonly workspaces: Observable<WorkspaceState>
  readonly startFindProblem: (sessionId: SessionId) => Promise<void>
}

/** Bounded read-only memory summary; documents remain in the workspace. */
export function PaperStatusView({ sessionId, rpc, sessions, workspaces, startFindProblem }: PaperStatusViewProps) {
  const sessionState = useSyncExternalStore(sessions.subscribe, sessions.getSnapshot, sessions.getSnapshot)
  const workspaceState = useSyncExternalStore(workspaces.subscribe, workspaces.getSnapshot, workspaces.getSnapshot)
  const workspace = workspaceForSession(sessionId, sessionState, workspaceState)
  const [submissionError, setSubmissionError] = useState<string>()
  const { status, error } = usePaperProjectStatus(rpc, workspace?.workspaceId)
  const start = (): void => {
    setSubmissionError(undefined)
    void startFindProblem(sessionId).catch((error: unknown) => {
      setSubmissionError(error instanceof Error ? error.message : String(error))
    })
  }
  if (workspace === undefined) return <Empty title="No paper workspace" copy="Select a session belonging to a registered workspace." />
  if (error !== undefined && status === undefined) return <Empty title="Status unavailable" copy={error} />
  if (status === undefined) return <div className="ipaper-view-loading">Reading shared research memory…</div>
  const summary = status?.summary
  return <main className="ipaper-view" data-testid="ipaper-status-view"><div className="ipaper-view-shell">
    <header className="ipaper-view-hero">
      <div className="ipaper-view-title-row"><div><p className="ipaper-view-kicker">Paper status</p><h1>{workspace.title}</h1></div><span>Revision {summary?.revision ?? 0}</span></div>
      <p className="ipaper-view-summary">Shared research memory: {summary?.counts.source ?? 0} sources, {summary?.counts.finding ?? 0} findings, {summary?.counts.note ?? 0} notes.</p>
      <p>Manuscripts and working plans live in workspace files. Recorded findings are not automatically verified.</p>
      <button type="button" className="ipaper-question-start" onClick={start}>Start guided workflow</button>
    </header>
    {submissionError !== undefined && <p role="alert">{submissionError}</p>}
    {error !== undefined && <p role="alert">Refresh failed: {error}</p>}
    <section><h2>Unresolved questions ({summary?.unresolvedCount ?? 0})</h2>
      {(summary?.unresolved.length ?? 0) === 0 && <p>No author-marked unresolved questions.</p>}
      {summary?.unresolved.map(record => <article key={record.id}><h3>{record.title}</h3><p>{record.text}</p><small>{record.id} · {record.kind}</small></article>)}
    </section>
    <section><h2>Recent records</h2>
      {(summary?.recent.length ?? 0) === 0 && <p>No research memory yet. Start a conversation to record sources, findings, and notes.</p>}
      {summary?.recent.map(record => <article key={record.id}><h3>{record.title}</h3><p>{record.text}</p><small>{record.id} · {record.kind} · version {record.version}</small></article>)}
      <p>Showing up to ten records per section. Ask the agent to search memory or inspect a record by ID for details.</p>
    </section>
  </div></main>
}
