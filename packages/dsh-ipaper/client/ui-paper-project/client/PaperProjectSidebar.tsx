import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { togglePaperStatusView } from './toggle.ts'

interface Observable<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

export interface PaperProjectSidebarProps {
  readonly wide: boolean
  readonly sessions: Observable<SessionListState>
}

function PaperIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M6.5 3.5h7l4 4v13h-11v-17Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M13.5 3.5v4h4M9 12h6M9 15.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Sidebar launcher that switches the resident conversation viewport to/from Paper status. */
export function PaperProjectSidebar({ wide, sessions }: PaperProjectSidebarProps) {
  const snapshot = useSyncExternalStore(sessions.subscribe, sessions.getSnapshot, sessions.getSnapshot)
  const [active, setActive] = useState(false)
  const [workspaceRegion, setWorkspaceRegion] = useState<HTMLElement>()
  const disabled = snapshot.current === undefined

  useLayoutEffect(() => {
    const region = document.querySelector<HTMLElement>('[data-slot="sidebar.workspaces"]')
    if (region !== null) setWorkspaceRegion(region)
  }, [])

  useEffect(() => {
    const sync = (): void => { setActive(document.documentElement.dataset.ipaperStatusOpen === 'true') }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ipaper-status-open'] })
    return () => { observer.disconnect() }
  }, [])

  const toggle = (): void => { setActive(togglePaperStatusView()) }

  if (workspaceRegion === undefined) return null
  return createPortal(
    <div className="ipaper-sidebar-launcher-seat" data-wide={wide || undefined}>
      <button
        type="button"
        className="ipaper-sidebar-button"
        data-active={active || undefined}
        data-wide={wide || undefined}
        disabled={disabled}
        aria-label="Toggle Paper status"
        aria-pressed={active}
        title="Paper status"
        onClick={toggle}
      >
        <span className="ipaper-sidebar-button-icon"><PaperIcon /></span>
        {wide && (
          <>
            <span className="ipaper-sidebar-button-label">Paper status</span>
            <span className="ipaper-sidebar-button-chevron"><ChevronIcon /></span>
          </>
        )}
      </button>
    </div>,
    workspaceRegion,
  )
}
