import type { ClientConnectionRpc, SessionId, WorkspaceView } from '@deepseek-ai/dsh-client-connection/client'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { PaperNode, PaperNodeKind, PaperProjectOverview, PaperProjectSnapshot } from '../../../src/paper-project/types.js'

const CHANNEL = '/ipaper'
const ENDPOINT = 'paper-project/status'
const TABS = ['overview', 'research', 'manuscript', 'activity'] as const
const LENSES = ['framing', 'research', 'argument', 'production', 'validation'] as const

type Tab = typeof TABS[number]
type Lens = typeof LENSES[number]
interface PaperProjectStatus { readonly snapshot: PaperProjectSnapshot; readonly overview: PaperProjectOverview }
interface Observable<T> { getSnapshot(): T; subscribe(listener: () => void): () => void }
interface WorkspaceState { readonly items: readonly WorkspaceView[] }

export interface PaperStatusViewProps {
  readonly sessionId: SessionId
  readonly rpc: ClientConnectionRpc
  readonly sessions: Observable<SessionListState>
  readonly workspaces: Observable<WorkspaceState>
}

const TAB_LABELS: Record<Tab, string> = { overview: 'Overview', research: 'Research & argument', manuscript: 'Manuscript', activity: 'Activity' }
const LENS_LABELS: Record<Lens, string> = { framing: 'Framing', research: 'Research', argument: 'Argument', production: 'Production', validation: 'Validation' }

function workspaceForSession(sessionId: SessionId, sessions: SessionListState, workspaces: WorkspaceState): WorkspaceView | undefined {
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

function nodesOf(status: PaperProjectStatus, kinds: readonly PaperNodeKind[]): PaperNode[] {
  const accepted = new Set(kinds)
  return status.snapshot.nodes.filter(node => accepted.has(node.kind)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function tone(status: string): 'attention' | 'good' | undefined {
  if (['blocked', 'contested', 'unverified', 'open'].includes(status)) return 'attention'
  if (['accepted', 'done', 'verified', 'supported', 'ready', 'resolved', 'satisfied'].includes(status)) return 'good'
  return undefined
}

function NodeList({ nodes, empty }: { readonly nodes: readonly PaperNode[]; readonly empty: string }) {
  if (nodes.length === 0) return <p className="ipaper-view-empty-copy">{empty}</p>
  return <ul className="ipaper-view-list">{nodes.map(node => {
    const statusTone = tone(node.status)
    return <li className="ipaper-view-item" key={node.id}>
      <span className="ipaper-view-kind">{node.kind}</span>
      <div><strong>{node.title}</strong>{node.summary !== '' && <p>{node.summary}</p>}</div>
      <span className="ipaper-view-chip" {...(statusTone === undefined ? {} : { 'data-tone': statusTone })}>{node.status}</span>
    </li>
  })}</ul>
}

function Empty({ title, copy }: { readonly title: string; readonly copy: string }) {
  return <div className="ipaper-view-empty"><div className="ipaper-view-empty-mark" /><h2>{title}</h2><p>{copy}</p></div>
}

function counted(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

/** Full workspace status surface rendered in place of the conversation view. */
export function PaperStatusView({ sessionId, rpc, sessions, workspaces }: PaperStatusViewProps) {
  const sessionState = useSyncExternalStore(sessions.subscribe, sessions.getSnapshot, sessions.getSnapshot)
  const workspaceState = useSyncExternalStore(workspaces.subscribe, workspaces.getSnapshot, workspaces.getSnapshot)
  const workspace = workspaceForSession(sessionId, sessionState, workspaceState)
  const workspaceId = workspace?.workspaceId
  const [tab, setTab] = useState<Tab>('overview')
  const [status, setStatus] = useState<PaperProjectStatus | null | undefined>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    document.documentElement.dataset.ipaperStatusOpen = 'true'
    return () => { delete document.documentElement.dataset.ipaperStatusOpen }
  }, [])

  const refresh = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (workspaceId === undefined) { setStatus(null); return }
    const result = await rpc.call(CHANNEL, ENDPOINT, { workspaceId }, signal)
    if (signal?.aborted === true) return
    if (!result.ok) { setError(result.error.message); return }
    setError(undefined)
    setStatus(result.value as PaperProjectStatus | null)
  }, [rpc, workspaceId])

  useEffect(() => {
    setStatus(undefined)
    setError(undefined)
    const controller = new AbortController()
    void refresh(controller.signal)
    const timer = window.setInterval(() => { void refresh(controller.signal) }, 3000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [refresh])

  const research = useMemo(() => status == null ? [] : nodesOf(status, ['source', 'evidence', 'claim']), [status])
  const manuscript = useMemo(() => status == null ? [] : nodesOf(status, ['artifact', 'review', 'decision']), [status])
  const events = useMemo(() => status == null ? [] : nodesOf(status, ['event']), [status])
  const openWork = useMemo(() => status == null ? [] : nodesOf(status, ['objective', 'requirement', 'task']).filter(node => !['done', 'resolved', 'retired', 'satisfied', 'waived', 'cancelled'].includes(node.status)), [status])
  const attention = useMemo(() => {
    if (status == null) return []
    const ids = new Set([...status.overview.blockedTaskIds, ...status.overview.unsupportedClaimIds, ...status.overview.contestedClaimIds, ...status.overview.openReviewIds, ...status.overview.unverifiedSourceIds, ...status.overview.integrityGaps.map(gap => gap.nodeId)])
    return status.snapshot.nodes.filter(node => ids.has(node.id))
  }, [status])

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
      <div className="ipaper-view-title-row">
        <div><p className="ipaper-view-kicker">Paper status</p><h1>{workspace.title}</h1></div>
        <span>Revision {status.snapshot.revision}</span>
      </div>
      <p className="ipaper-view-summary">
        {counted(semanticCount, 'project record')}: {counted(sourceCount, 'source')}, {counted(claimCount, 'claim')}, and {counted(artifactCount, 'artifact')}. {gapCount === 0 ? 'No integrity gaps.' : `${counted(gapCount, 'integrity gap')}.`}
      </p>
    </header>
    <nav className="ipaper-view-tabs" aria-label="Paper project views">{TABS.map(key => <button key={key} type="button" aria-selected={tab === key} onClick={() => { setTab(key) }}>{TAB_LABELS[key]}</button>)}</nav>
    {tab === 'overview' && <>
      <section><div className="ipaper-view-section-head"><h2>Project lenses</h2><span>Dynamic signals, not linear stages</span></div><div className="ipaper-view-lenses">{LENSES.map(key => { const lens = status.overview.lenses[key]; return <article key={key} data-state={lens.status}><div><strong>{LENS_LABELS[key]}</strong><span>{lens.count}</span></div><p><i />{lens.status === 'needs-attention' ? 'Needs attention' : lens.status === 'active' ? 'In progress' : 'Clear'}</p></article> })}</div></section>
      <div className="ipaper-view-columns"><section className="ipaper-view-card"><div className="ipaper-view-section-head"><h2>Attention queue</h2><span>{attention.length} surfaced</span></div><NodeList nodes={attention} empty="No integrity or support issues are currently surfaced." /></section><section className="ipaper-view-card"><div className="ipaper-view-section-head"><h2>Open work</h2><span>{openWork.length} active</span></div><NodeList nodes={openWork.slice(0, 6)} empty="No open objectives, requirements, or tasks." /></section></div>
    </>}
    {tab === 'research' && <section className="ipaper-view-card"><div className="ipaper-view-section-head"><h2>Research & argument</h2><span>{research.length} records</span></div><NodeList nodes={research} empty="No sources, evidence, or claims recorded yet." /></section>}
    {tab === 'manuscript' && <section className="ipaper-view-card"><div className="ipaper-view-section-head"><h2>Manuscript & review</h2><span>{manuscript.length} records</span></div><NodeList nodes={manuscript} empty="No artifacts, reviews, or decisions recorded yet." /></section>}
    {tab === 'activity' && <section className="ipaper-view-card"><div className="ipaper-view-section-head"><h2>Project activity</h2><span>{events.length} changes</span></div><NodeList nodes={events} empty="No committed graph changes yet." /></section>}
  </div></main>
}
