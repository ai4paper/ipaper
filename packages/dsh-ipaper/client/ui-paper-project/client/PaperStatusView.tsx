import type { ClientConnectionRpc, SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { attentionNodes } from './attentionNodes.ts'
import { counted } from './counted.ts'
import { Empty } from './Empty.tsx'
import { nodesOf } from './nodesOf.ts'
import { OverviewView } from './OverviewView.tsx'
import { ProjectGraphView } from './ProjectGraphView.tsx'
import { RecordsView } from './RecordsView.tsx'
import { TABS, type Observable, type Tab, type WorkspaceState } from './types.ts'
import { usePaperProjectStatus } from './usePaperProjectStatus.ts'
import { workspaceForSession } from './workspaceForSession.ts'

export interface PaperStatusViewProps {
  readonly sessionId: SessionId
  readonly rpc: ClientConnectionRpc
  readonly sessions: Observable<SessionListState>
  readonly workspaces: Observable<WorkspaceState>
}

const TAB_LABELS: Record<Tab, string> = { overview: 'Overview', graph: 'Project graph', research: 'Research & argument', manuscript: 'Manuscript', activity: 'Activity' }

/** Full workspace status surface rendered in place of the conversation view. */
export function PaperStatusView({ sessionId, rpc, sessions, workspaces }: PaperStatusViewProps) {
  const sessionState = useSyncExternalStore(sessions.subscribe, sessions.getSnapshot, sessions.getSnapshot)
  const workspaceState = useSyncExternalStore(workspaces.subscribe, workspaces.getSnapshot, workspaces.getSnapshot)
  const workspace = workspaceForSession(sessionId, sessionState, workspaceState)
  const [tab, setTab] = useState<Tab>('overview')
  const { status, error } = usePaperProjectStatus(rpc, workspace?.workspaceId)

  useEffect(() => {
    document.documentElement.dataset.ipaperStatusOpen = 'true'
    return () => { delete document.documentElement.dataset.ipaperStatusOpen }
  }, [])

  const research = useMemo(() => status == null ? [] : nodesOf(status, ['source', 'evidence', 'claim']), [status])
  const manuscript = useMemo(() => status == null ? [] : nodesOf(status, ['artifact', 'review', 'decision']), [status])
  const events = useMemo(() => status == null ? [] : nodesOf(status, ['event']), [status])
  const openWork = useMemo(() => status == null ? [] : nodesOf(status, ['objective', 'requirement', 'task']).filter(node => !['done', 'resolved', 'retired', 'satisfied', 'waived', 'cancelled'].includes(node.status)), [status])
  const attention = useMemo(() => attentionNodes(status), [status])

  if (workspace === undefined) return <Empty title="No paper workspace" copy="Select a session belonging to a registered workspace." />
  if (error !== undefined && status === undefined) return <Empty title="Status unavailable" copy={error} />
  if (status === undefined) return <div className="ipaper-view-loading">Reading the Paper Project Graph…</div>
  if (status === null) return <Empty title="A clean sheet" copy="Project signals appear as IPaper records objectives, sources, claims, artifacts, and reviews." />

  const semanticCount = status.snapshot.nodes.filter(node => node.kind !== 'project' && node.kind !== 'event').length
  const sourceCount = status.overview.countsByKind.source ?? 0
  const claimCount = status.overview.countsByKind.claim ?? 0
  const artifactCount = status.overview.countsByKind.artifact ?? 0
  const gapCount = status.overview.integrityGaps.length

  return <main className="ipaper-view" data-testid="ipaper-status-view"><div className="ipaper-view-shell">
    <header className="ipaper-view-hero">
      <div className="ipaper-view-title-row"><div><p className="ipaper-view-kicker">Paper status</p><h1>{workspace.title}</h1></div><span>Revision {status.snapshot.revision}</span></div>
      <p className="ipaper-view-summary">{counted(semanticCount, 'project record')}: {counted(sourceCount, 'source')}, {counted(claimCount, 'claim')}, and {counted(artifactCount, 'artifact')}. {gapCount === 0 ? 'No integrity gaps.' : `${counted(gapCount, 'integrity gap')}.`}</p>
    </header>
    <nav className="ipaper-view-tabs" aria-label="Paper project views">{TABS.map(key => <button key={key} type="button" aria-selected={tab === key} onClick={() => { setTab(key) }}>{TAB_LABELS[key]}</button>)}</nav>
    {tab === 'overview' && <OverviewView status={status} attention={attention} openWork={openWork} />}
    {tab === 'graph' && <ProjectGraphView status={status} />}
    {tab === 'research' && <RecordsView title="Research & argument" countLabel="records" nodes={research} empty="No sources, evidence, or claims recorded yet." />}
    {tab === 'manuscript' && <RecordsView title="Manuscript & review" countLabel="records" nodes={manuscript} empty="No artifacts, reviews, or decisions recorded yet." />}
    {tab === 'activity' && <RecordsView title="Project activity" countLabel="changes" nodes={events} empty="No committed graph changes yet." />}
  </div></main>
}
