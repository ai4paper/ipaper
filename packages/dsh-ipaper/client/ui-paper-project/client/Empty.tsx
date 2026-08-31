export interface EmptyProps {
  readonly title: string
  readonly copy: string
}

export function Empty({ title, copy }: EmptyProps) {
  return <div className="ipaper-view-empty"><div className="ipaper-view-empty-mark" /><h2>{title}</h2><p>{copy}</p></div>
}
