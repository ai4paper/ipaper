import type { PaperNode } from '../../../src/paper-project/types.js'
import { NodeList } from './NodeList.tsx'
import { LENSES, type Lens, type PaperProjectStatus } from './types.ts'

const LENS_LABELS: Record<Lens, string> = { framing: 'Framing', research: 'Research', argument: 'Argument', production: 'Production', validation: 'Validation' }

export interface OverviewViewProps {
  readonly status: PaperProjectStatus
  readonly attention: readonly PaperNode[]
  readonly openWork: readonly PaperNode[]
}

export function OverviewView({ status, attention, openWork }: OverviewViewProps) {
  return <>
    <section>
      <div className="ipaper-view-section-head"><h2>Project lenses</h2><span>Dynamic signals, not linear stages</span></div>
      <div className="ipaper-view-lenses">{LENSES.map(key => {
        const lens = status.overview.lenses[key]
        return <article key={key} data-state={lens.status}><div><strong>{LENS_LABELS[key]}</strong><span>{lens.count}</span></div><p><i />{lens.status === 'needs-attention' ? 'Needs attention' : lens.status === 'active' ? 'In progress' : 'Clear'}</p></article>
      })}</div>
    </section>
    <div className="ipaper-view-columns">
      <section className="ipaper-view-card"><div className="ipaper-view-section-head"><h2>Attention queue</h2><span>{attention.length} surfaced</span></div><NodeList nodes={attention} empty="No integrity or support issues are currently surfaced." /></section>
      <section className="ipaper-view-card"><div className="ipaper-view-section-head"><h2>Open work</h2><span>{openWork.length} active</span></div><NodeList nodes={openWork.slice(0, 6)} empty="No open objectives, requirements, or tasks." /></section>
    </div>
  </>
}
