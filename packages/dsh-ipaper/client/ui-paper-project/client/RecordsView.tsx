import type { PaperNode } from '../../../src/paper-project/types.js'
import { NodeList } from './NodeList.tsx'

export interface RecordsViewProps {
  readonly title: string
  readonly countLabel: string
  readonly nodes: readonly PaperNode[]
  readonly empty: string
}

export function RecordsView({ title, countLabel, nodes, empty }: RecordsViewProps) {
  return <section className="ipaper-view-card"><div className="ipaper-view-section-head"><h2>{title}</h2><span>{nodes.length} {countLabel}</span></div><NodeList nodes={nodes} empty={empty} /></section>
}
