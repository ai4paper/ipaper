import type { PaperNode } from '../../../src/paper-project/types.js'
import { tone } from './tone.ts'

export interface NodeListProps {
  readonly nodes: readonly PaperNode[]
  readonly empty: string
}

export function NodeList({ nodes, empty }: NodeListProps) {
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
