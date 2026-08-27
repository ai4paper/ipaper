import cytoscape, { type Core, type EventObject } from 'cytoscape'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PaperEdge, PaperNode } from '../../../src/paper-project/types.js'
import { graphElements } from './graphElements.ts'
import { GRAPH_STYLES } from './graphStyles.ts'
import { toggleFullscreen } from './toggleFullscreen.ts'

export interface PaperProjectGraphProps {
  readonly nodes: readonly PaperNode[]
  readonly edges: readonly PaperEdge[]
}

export function PaperProjectGraph({ nodes, edges }: PaperProjectGraphProps) {
  const cardRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<Core>()
  const [selectedNodeId, setSelectedNodeId] = useState<string>()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const signature = useMemo(() => `${nodes.map(node => `${node.id}:${node.version}`).join('|')}::${edges.map(edge => edge.id).join('|')}`, [edges, nodes])
  const selectedNode = nodes.find(node => node.id === selectedNodeId)

  useEffect(() => {
    if (containerRef.current === null) return
    const graph = cytoscape({
      container: containerRef.current,
      elements: [],
      style: GRAPH_STYLES,
      minZoom: 0.35,
      maxZoom: 2.5,
      wheelSensitivity: 0.25,
    })
    graph.on('mouseover', 'node', (event: EventObject) => { event.target.addClass('hovered') })
    graph.on('mouseout', 'node', (event: EventObject) => { event.target.removeClass('hovered') })
    graph.on('tap', 'node', (event: EventObject) => { setSelectedNodeId(event.target.id()) })
    graph.on('tap', (event: EventObject) => { if (event.target === graph) setSelectedNodeId(undefined) })
    graphRef.current = graph
    return () => {
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
    graph.layout({ name: 'cose', animate: false, fit: true, padding: 36, nodeRepulsion: () => 6200, idealEdgeLength: () => 85 }).run()
    if (selectedNodeId !== undefined && graph.getElementById(selectedNodeId).empty()) setSelectedNodeId(undefined)
  }, [signature])

  return <section className="ipaper-view-graph-card" aria-labelledby="ipaper-project-graph-title" ref={cardRef}>
    <div className="ipaper-view-section-head">
      <div><h2 id="ipaper-project-graph-title">Project graph</h2><p>Hover for a title; select a node for details. Drag to rearrange and scroll to zoom.</p></div>
      <div className="ipaper-view-graph-actions">
        <span>{nodes.length} nodes · {edges.length} links</span>
        <button type="button" onClick={() => { if (cardRef.current !== null) void toggleFullscreen(cardRef.current) }} aria-label={isFullscreen ? 'Exit full screen' : 'Show graph full screen'} title={isFullscreen ? 'Exit full screen' : 'Show full screen'}>
          {isFullscreen
            ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3v4H3M13 3v4h4M7 17v-4H3M13 17v-4h4" /></svg>
            : <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" /></svg>}
        </button>
      </div>
    </div>
    <div className="ipaper-view-graph" ref={containerRef} role="img" aria-label={`Paper project graph with ${nodes.length} nodes and ${edges.length} links`} />
    <div className="ipaper-view-graph-footer">
      <ul className="ipaper-view-graph-legend" aria-label="Graph legend">
        <li data-color="planning">Planning</li><li data-color="research">Research</li><li data-color="argument">Argument</li><li data-color="production">Production</li><li data-color="attention">Needs attention</li>
      </ul>
      {selectedNode === undefined
        ? <p className="ipaper-view-graph-selection">Select a node to inspect its status.</p>
        : <p className="ipaper-view-graph-selection"><strong>{selectedNode.title}</strong><span>{selectedNode.kind} · {selectedNode.status}</span></p>}
    </div>
  </section>
}
