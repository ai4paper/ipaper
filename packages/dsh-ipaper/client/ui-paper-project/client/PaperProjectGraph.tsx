import cytoscape, { type Core, type EdgeSingular, type EventObject } from 'cytoscape'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PaperEdge, PaperNode } from '../../../src/paper-project/types.js'
import { graphElements } from './graphElements.ts'
import { GRAPH_STYLES } from './graphStyles.ts'
import { toggleFullscreen } from './toggleFullscreen.ts'

export interface PaperProjectGraphProps {
  readonly nodes: readonly PaperNode[]
  readonly edges: readonly PaperEdge[]
}

const readableKind = (kind: string): string => kind.replaceAll('_', ' ')

export function PaperProjectGraph({ nodes, edges }: PaperProjectGraphProps) {
  const cardRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Core>()
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [query, setQuery] = useState('')
  const signature = useMemo(() => `${nodes.map(node => `${node.id}:${node.version}`).join('|')}::${edges.map(edge => edge.id).join('|')}`, [edges, nodes])
  const selectedNode = nodes.find(node => node.id === selectedNodeId)
  const nodeById = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes])
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return needle === '' ? nodes : nodes.filter(node => `${node.title} ${node.kind} ${node.status}`.toLocaleLowerCase().includes(needle))
  }, [nodes, query])
  const selectedEdges = useMemo(() => edges.filter(edge => edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId), [edges, selectedNodeId])

  const clearFocus = (): void => {
    const graph = graphRef.current
    if (graph !== undefined) {
      graph.elements().removeClass('dimmed focused related search-match')
      graph.edges().removeStyle('label').removeStyle('text-opacity')
    }
    setSelectedNodeId(undefined)
  }

  const focusNode = (nodeId: string): void => {
    const graph = graphRef.current
    const node = graph?.getElementById(nodeId)
    if (graph === undefined || node === undefined || node.empty()) return
    const relatedEdges = node.connectedEdges()
    const relatedNodes = relatedEdges.connectedNodes().add(node)
    graph.elements().removeClass('focused related').addClass('dimmed')
    graph.edges().removeStyle('label').removeStyle('text-opacity')
    relatedNodes.removeClass('dimmed').addClass('related')
    relatedEdges.removeClass('dimmed').addClass('related')
    relatedEdges.forEach((edge: EdgeSingular) => {
      edge.style('label', String(edge.data('label')))
      edge.style('text-opacity', 1)
    })
    node.removeClass('dimmed').addClass('focused')
    graph.fit(relatedNodes, 72)
    setSelectedNodeId(nodeId)
  }

  useEffect(() => {
    if (containerRef.current === null) return
    const graph = cytoscape({
      container: containerRef.current,
      elements: [],
      style: GRAPH_STYLES,
      minZoom: 0.35,
      maxZoom: 2.5,
      wheelSensitivity: 0.25,
      boxSelectionEnabled: true,
    })
    graph.on('mouseover', 'node', (event: EventObject) => { event.target.addClass('hovered') })
    graph.on('mouseout', 'node', (event: EventObject) => { event.target.removeClass('hovered') })
    let boxZoomFrame: number | undefined
    const handleWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey || containerRef.current === null) return
      event.preventDefault()
      event.stopPropagation()
      const bounds = containerRef.current.getBoundingClientRect()
      const renderedPosition = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
      const factor = Math.pow(1.7, -event.deltaY / 100)
      const level = Math.max(graph.minZoom(), Math.min(graph.maxZoom(), graph.zoom() * factor))
      graph.zoom({ level, renderedPosition })
    }
    containerRef.current.addEventListener('wheel', handleWheel, { passive: false })
    graph.on('tap', 'node', (event: EventObject) => { focusNode(event.target.id()) })
    graph.on('tap', (event: EventObject) => { if (event.target === graph) clearFocus() })
    graph.on('boxselect', 'node', () => {
      if (boxZoomFrame !== undefined) return
      boxZoomFrame = window.requestAnimationFrame(() => {
        const boxedNodes = graph.nodes(':selected')
        if (boxedNodes.nonempty()) graph.fit(boxedNodes, 48)
        boxedNodes.unselect()
        graph.elements().removeClass('dimmed focused related')
        graph.edges().removeStyle('label').removeStyle('text-opacity')
        setSelectedNodeId(undefined)
        boxZoomFrame = undefined
      })
    })
    graphRef.current = graph
    return () => {
      if (boxZoomFrame !== undefined) window.cancelAnimationFrame(boxZoomFrame)
      containerRef.current?.removeEventListener('wheel', handleWheel)
      graph.destroy()
      graphRef.current = undefined
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = (): void => {
      setIsFullscreen(document.fullscreenElement === cardRef.current)
      window.requestAnimationFrame(() => { graphRef.current?.resize() })
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => { document.removeEventListener('fullscreenchange', handleFullscreenChange) }
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    if (graph === undefined) return
    graph.elements().remove()
    graph.add(graphElements(nodes, edges))
    graph.elements('node, edge.layout-edge').layout({
      name: 'breadthfirst', directed: true, circle: false, animate: false, fit: true,
      padding: 48, spacingFactor: 2.4, avoidOverlap: true, nodeDimensionsIncludeLabels: true,
      transform: (_node, position) => ({ x: position.y * 1.25, y: position.x }),
    }).run()
    if (selectedNodeId !== undefined && graph.getElementById(selectedNodeId).empty()) setSelectedNodeId(undefined)
  }, [signature])

  useEffect(() => {
    const graph = graphRef.current
    const needle = query.trim().toLocaleLowerCase()
    if (graph === undefined) return
    if (needle === '') {
      graph.nodes().removeClass('search-match')
      if (selectedNodeId === undefined) graph.nodes().removeClass('dimmed')
      return
    }
    graph.nodes().forEach(node => {
      const isMatch = `${node.data('label')} ${node.data('kind')} ${node.data('status')}`.toLocaleLowerCase().includes(needle)
      node.toggleClass('search-match', isMatch)
      if (selectedNodeId === undefined) node.toggleClass('dimmed', !isMatch)
    })
  }, [query, selectedNodeId, signature])

  return <section className="ipaper-view-graph-card" aria-labelledby="ipaper-project-graph-title" ref={cardRef}>
    <div className="ipaper-view-section-head">
      <div><h2 id="ipaper-project-graph-title">Project graph</h2><p id="ipaper-project-graph-help">Relationships flow left to right. Select a node to focus its neighborhood. Drag to pan, scroll to zoom, or hold Shift and drag to zoom to a region.</p></div>
      <div className="ipaper-view-graph-actions">
        <span>{nodes.length} nodes · {edges.length} links</span>
        <button type="button" onClick={() => graphRef.current?.fit(undefined, 48)} aria-label="Fit graph to view" title="Fit graph to view"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" /></svg></button>
        <button type="button" onClick={() => { const graph = graphRef.current; if (graph !== undefined) graph.zoom({ level: Math.min(graph.maxZoom(), graph.zoom() * 1.25), renderedPosition: { x: graph.width() / 2, y: graph.height() / 2 } }) }} aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" onClick={() => { const graph = graphRef.current; if (graph !== undefined) graph.zoom({ level: Math.max(graph.minZoom(), graph.zoom() / 1.25), renderedPosition: { x: graph.width() / 2, y: graph.height() / 2 } }) }} aria-label="Zoom out" title="Zoom out">−</button>
        <button type="button" onClick={clearFocus} aria-label="Clear selection" title="Clear selection">×</button>
        <button type="button" onClick={() => { if (cardRef.current !== null) void toggleFullscreen(cardRef.current) }} aria-label={isFullscreen ? 'Exit full screen' : 'Show graph full screen'} title={isFullscreen ? 'Exit full screen' : 'Show full screen'}>{isFullscreen ? '↙' : '↗'}</button>
      </div>
    </div>
    <form className="ipaper-view-graph-search" onSubmit={event => { event.preventDefault(); const first = matches[0]; if (first !== undefined) focusNode(first.id) }}>
      <label htmlFor="ipaper-project-graph-search">Find a node</label>
      <input id="ipaper-project-graph-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Title, kind, or status" aria-controls="ipaper-project-node-list" />
      {query.trim() !== '' && <span aria-live="polite">{matches.length} match{matches.length === 1 ? '' : 'es'}</span>}
    </form>
    <div className="ipaper-view-graph" ref={containerRef} role="img" aria-labelledby="ipaper-project-graph-title" aria-describedby="ipaper-project-graph-help" />
    <div className="ipaper-view-graph-footer">
      <details className="ipaper-view-graph-key"><summary>Graph key</summary><div className="ipaper-view-graph-legends">
        <ul className="ipaper-view-graph-legend ipaper-view-graph-shapes" aria-label="Node shape legend">
          <li data-shape="hexagon">Objective</li><li data-shape="round-rectangle">Requirement</li><li data-shape="rectangle">Task</li><li data-shape="ellipse">Source</li><li data-shape="triangle">Evidence</li><li data-shape="octagon">Claim</li><li data-shape="rhomboid">Artifact</li><li data-shape="vee">Review</li><li data-shape="star">Decision</li><li data-shape="barrel">Note</li>
        </ul><ul className="ipaper-view-graph-legend ipaper-view-graph-edges" aria-label="Relationship line legend">
          <li data-edge="contains">contains</li><li data-edge="addresses">addresses</li><li data-edge="depends_on">depends on</li><li data-edge="produces">produces</li><li data-edge="derived_from">derived from</li><li data-edge="supports">supports</li><li data-edge="contradicts">contradicts</li><li data-edge="cites">cites</li><li data-edge="reviews">reviews</li><li data-edge="resolves">resolves</li><li data-edge="supersedes">supersedes</li><li data-edge="affects">affects</li>
        </ul>
      </div></details>
      <p className="ipaper-view-graph-selection" aria-live="polite">{selectedNode === undefined ? 'Select a node to inspect its status.' : <><strong>{selectedNode.title}</strong><span>{readableKind(selectedNode.kind)} · {selectedNode.status}</span></>}</p>
    </div>
    <div className="ipaper-view-graph-accessible">
      <h3>Nodes</h3><p>Use this list to inspect every graph node without a pointer.</p>
      <ul id="ipaper-project-node-list" role="listbox" aria-label="Project graph nodes">
        {matches.map((node, index) => <li key={node.id}><button type="button" role="option" aria-selected={node.id === selectedNodeId} onClick={() => focusNode(node.id)} onKeyDown={event => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          event.preventDefault()
          const buttons = Array.from(event.currentTarget.closest('ul')?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])
          const nextIndex = (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
          buttons[nextIndex]?.focus()
        }}><strong>{node.title}</strong><span>{readableKind(node.kind)} · {node.status}{['blocked', 'contested', 'disputed', 'unverified'].includes(node.status) ? ' · needs attention' : ''}</span></button></li>)}
      </ul>
      {selectedNode !== undefined && <div className="ipaper-view-graph-inspector"><h3>Selected node</h3><p>{selectedNode.summary || 'No summary provided.'}</p><ul>{selectedEdges.map(edge => { const otherId = edge.sourceId === selectedNode.id ? edge.targetId : edge.sourceId; const other = nodeById.get(otherId); return <li key={edge.id}>{edge.sourceId === selectedNode.id ? '→' : '←'} {readableKind(edge.kind)} <strong>{other?.title ?? 'Unknown node'}</strong></li> })}</ul></div>}
    </div>
  </section>
}
