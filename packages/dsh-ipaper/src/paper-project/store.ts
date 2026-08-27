import { randomUUID } from 'node:crypto'
import { realpath, stat } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import type { Domain, DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { canonicalArtifactPath, validatePaperGraph } from './invariants.js'
import {
  paperNodeAttributesSchemas,
  paperNodeSchema,
  paperProjectDomainSpec,
  storedPaperProjectRecordSchema,
} from './spec.js'
import type {
  PendingPaperMutation,
  StoredPaperEdge,
  StoredPaperNode,
  StoredPaperProjectRecord,
} from './spec.js'
import {
  PAPER_NODE_KINDS,
  PAPER_NODE_STATUSES,
} from './types.js'
import type {
  ArtifactAttributes,
  MutablePaperNodeKind,
  PaperEdge,
  PaperMutationCaller,
  PaperMutationInput,
  PaperMutationResult,
  PaperNode,
  PaperNodeKind,
  PaperProjectRecord,
  PaperProjectSnapshot,
} from './types.js'

export class PaperProjectNotFoundError extends Error {
  constructor(workspaceId: string) {
    super(`paper project for workspace '${workspaceId}' does not exist`)
    this.name = 'PaperProjectNotFoundError'
  }
}

export class PaperNodeVersionConflictError extends Error {
  constructor(nodeId: string, expected: number, actual: number) {
    super(`paper node '${nodeId}' version conflict: expected ${String(expected)}, current version is ${String(actual)}`)
    this.name = 'PaperNodeVersionConflictError'
  }
}

function physicalNodeKey(projectId: string, nodeId: string): string {
  return `${projectId}:${nodeId}`
}

function physicalEdgeKey(projectId: string, edgeId: string): string {
  return `${projectId}:${edgeId}`
}

function committedProject(record: StoredPaperProjectRecord): PaperProjectRecord {
  const { pendingMutation: _, ...project } = record
  return project
}

function copySequences(source?: Readonly<Record<PaperNodeKind, number>>): Record<PaperNodeKind, number> {
  return Object.fromEntries(PAPER_NODE_KINDS.map(kind => [kind, source?.[kind] ?? 1])) as Record<PaperNodeKind, number>
}

const SUBAGENT_NODE_KINDS = new Set<MutablePaperNodeKind>([
  'source',
  'evidence',
  'claim',
  'artifact',
  'review',
  'note',
])

function defaultAttributes(kind: MutablePaperNodeKind): unknown {
  switch (kind) {
    case 'source': return { bibliographicMetadataVerified: false }
    case 'evidence': return { evidenceType: 'other', verbatim: false }
    case 'artifact': return { artifactType: 'other' }
    default: return {}
  }
}

async function normalizeNodeAttributes(
  kind: MutablePaperNodeKind,
  attributes: unknown,
  workspacePath: string,
  checkedAt: string,
): Promise<unknown> {
  if (kind !== 'artifact') return attributes
  const artifact = attributes as ArtifactAttributes
  if (artifact.path === undefined) {
    const withoutPathCheck = { ...artifact } as Record<string, unknown>
    delete withoutPathCheck.pathStatus
    delete withoutPathCheck.pathCheckedAt
    return withoutPathCheck
  }
  const path = canonicalArtifactPath(workspacePath, artifact.path)
  const absolute = resolve(workspacePath, path)
  let pathStatus: 'exists' | 'missing' = 'missing'
  try {
    await stat(absolute)
    const actual = await realpath(absolute)
    canonicalArtifactPath(workspacePath, relative(workspacePath, actual))
    pathStatus = 'exists'
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
  }
  return {
    ...artifact,
    path,
    pathStatus,
    pathCheckedAt: checkedAt,
  }
}

function isObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneSnapshot(snapshot: PaperProjectSnapshot): PaperProjectSnapshot {
  return structuredClone(snapshot)
}

export class PaperProjectStore {
  private readonly projects
  private readonly nodes
  private readonly edges
  private readonly snapshots = new Map<string, PaperProjectSnapshot>()
  private readonly queues = new Map<string, Promise<void>>()
  private initialized = false

  private constructor(private readonly domain: Domain<typeof paperProjectDomainSpec>) {
    this.projects = domain.table('projects')
    this.nodes = domain.table('nodes')
    this.edges = domain.table('edges')
  }

  static async open(facility: DomainFacility): Promise<PaperProjectStore> {
    const domain = await facility.open(paperProjectDomainSpec)
    const store = new PaperProjectStore(domain)
    try {
      await store.initialize()
      return store
    } catch (error) {
      await domain.close()
      throw error
    }
  }

  async close(): Promise<void> {
    await Promise.allSettled(this.queues.values())
    await this.domain.close()
  }

  listProjects(): readonly PaperProjectRecord[] {
    this.assertInitialized()
    return [...this.snapshots.values()].map(snapshot => {
      const stored = this.projects.get(snapshot.workspaceId)
      if (stored === undefined) throw new Error(`paper project cache references missing workspace '${snapshot.workspaceId}'`)
      return structuredClone(committedProject(stored))
    })
  }

  getSnapshot(workspaceId: string): PaperProjectSnapshot | undefined {
    this.assertInitialized()
    const snapshot = this.snapshots.get(workspaceId)
    return snapshot === undefined ? undefined : cloneSnapshot(snapshot)
  }

  async ensurePaperProject(
    workspaceId: string,
    workspacePath: string,
    createdBySessionId: string,
  ): Promise<PaperProjectSnapshot> {
    this.assertInitialized()
    return await this.enqueue(workspaceId, async () => {
      const existing = this.projects.get(workspaceId)
      if (existing !== undefined) {
        await this.recoverRecord(workspaceId, existing)
        const project = committedProject(this.requireProject(workspaceId))
        if (project.workspacePath !== workspacePath) {
          throw new Error(`workspace '${workspaceId}' path changed from '${project.workspacePath}' to '${workspacePath}'`)
        }
        return cloneSnapshot(this.requireSnapshot(workspaceId))
      }

      const now = new Date().toISOString()
      const projectId = `paper-${workspaceId}`
      const sequences = copySequences()
      sequences.project = 2
      const project: PaperProjectRecord = {
        projectId,
        workspaceId,
        workspacePath,
        rootNodeId: 'project-1',
        revision: 0,
        nextNodeSequenceByKind: sequences,
        nextEdgeSequence: 1,
        createdAt: now,
        updatedAt: now,
      }
      const root = paperNodeSchema.parse({
        id: project.rootNodeId,
        projectId,
        kind: 'project',
        title: 'Paper project',
        summary: 'Workspace-scoped scholarly paper project.',
        status: 'active',
        attributes: { workspacePath },
        version: 1,
        createdBySessionId,
        updatedBySessionId: createdBySessionId,
        createdAt: now,
        updatedAt: now,
      }) as PaperNode
      const pending: PendingPaperMutation = {
        mutationId: `ensure-${randomUUID()}`,
        finalProject: project,
        nodes: [root as StoredPaperNode],
        edges: [],
      }
      await this.projects.put(workspaceId, storedPaperProjectRecordSchema.parse({ ...project, pendingMutation: pending }))
      await this.finishOrRecover(workspaceId, pending)
      return cloneSnapshot(this.requireSnapshot(workspaceId))
    })
  }

  async record(
    workspaceId: string,
    caller: PaperMutationCaller,
    input: PaperMutationInput,
  ): Promise<PaperMutationResult> {
    this.assertInitialized()
    return await this.enqueue(workspaceId, async () => {
      const stored = this.projects.get(workspaceId)
      if (stored === undefined) throw new PaperProjectNotFoundError(workspaceId)
      await this.recoverRecord(workspaceId, stored)

      const snapshot = this.requireSnapshot(workspaceId)
      const project = committedProject(this.requireProject(workspaceId))
      const sequences = copySequences(project.nextNodeSequenceByKind)
      let nextEdgeSequence = project.nextEdgeSequence
      const nodesById = new Map(snapshot.nodes.map(node => [node.id, node]))
      const edges = [...snapshot.edges]
      const createdRefs = new Map<string, string>()
      const createdNodes: PaperNode[] = []
      const updatedNodes: PaperNode[] = []
      const now = new Date().toISOString()
      let subagentTaskId: string | undefined
      if (caller.origin === 'subagent') {
        if (input.taskId === undefined) throw new Error('subagent paper mutations require taskId')
        const task = nodesById.get(input.taskId)
        if (task?.kind !== 'task') throw new Error(`subagent taskId '${input.taskId}' is not an existing task`)
        if ((input.updates?.length ?? 0) > 0) throw new Error('subagents cannot update existing paper nodes')
        subagentTaskId = task.id
      }

      const allocateNodeId = (kind: PaperNodeKind): string => {
        const sequence = sequences[kind]
        sequences[kind] = sequence + 1
        return `${kind}-${String(sequence)}`
      }
      const allocateEdgeId = (): string => {
        const id = `edge-${String(nextEdgeSequence)}`
        nextEdgeSequence += 1
        return id
      }
      const resolveEndpoint = (endpoint: string): string => createdRefs.get(endpoint) ?? endpoint

      for (const request of input.nodes ?? []) {
        if (!Object.hasOwn(paperNodeAttributesSchemas, request.kind)) throw new Error(`models cannot create '${request.kind}' paper nodes`)
        if (caller.origin === 'subagent' && !SUBAGENT_NODE_KINDS.has(request.kind)) {
          throw new Error(`subagents cannot create '${request.kind}' paper nodes`)
        }
        if (caller.origin === 'subagent' && request.kind === 'claim' && request.status !== undefined && request.status !== 'proposed') {
          throw new Error("subagents may create claims only with status 'proposed'")
        }
        if (createdRefs.has(request.ref) || nodesById.has(request.ref)) throw new Error(`paper mutation repeats local ref '${request.ref}'`)
        const nodeId = allocateNodeId(request.kind)
        const parsedAttributes = paperNodeAttributesSchemas[request.kind].parse(request.attributes ?? defaultAttributes(request.kind))
        const attributes = await normalizeNodeAttributes(request.kind, parsedAttributes, project.workspacePath, now)
        const status = request.status ?? PAPER_NODE_STATUSES[request.kind][0]
        const node = paperNodeSchema.parse({
          id: nodeId,
          projectId: project.projectId,
          kind: request.kind,
          title: request.title,
          summary: request.summary ?? '',
          status,
          attributes,
          version: 1,
          createdBySessionId: caller.sessionId,
          updatedBySessionId: caller.sessionId,
          createdAt: now,
          updatedAt: now,
        }) as PaperNode
        createdRefs.set(request.ref, nodeId)
        nodesById.set(nodeId, node)
        createdNodes.push(node)
      }

      const seenUpdates = new Set<string>()
      for (const request of input.updates ?? []) {
        if (seenUpdates.has(request.id)) throw new Error(`paper mutation updates node '${request.id}' more than once`)
        seenUpdates.add(request.id)
        const current = nodesById.get(request.id)
        if (current === undefined) throw new Error(`paper mutation references missing node '${request.id}'`)
        if (current.kind === 'project' || current.kind === 'event') throw new Error(`paper mutation cannot update system node '${request.id}'`)
        if (current.version !== request.expectedVersion) {
          throw new PaperNodeVersionConflictError(current.id, request.expectedVersion, current.version)
        }
        const patch = request.attributesPatch
        if (patch !== undefined && !isObject(patch)) throw new Error(`attributesPatch for '${request.id}' must be an object`)
        const parsedAttributes = paperNodeAttributesSchemas[current.kind].parse({
          ...current.attributes,
          ...(patch ?? {}),
        })
        const attributes = await normalizeNodeAttributes(current.kind, parsedAttributes, project.workspacePath, now)
        const updated = paperNodeSchema.parse({
          ...current,
          ...(request.title === undefined ? {} : { title: request.title }),
          ...(request.summary === undefined ? {} : { summary: request.summary }),
          ...(request.status === undefined ? {} : { status: request.status }),
          attributes,
          version: current.version + 1,
          updatedBySessionId: caller.sessionId,
          updatedAt: now,
        }) as PaperNode
        nodesById.set(updated.id, updated)
        updatedNodes.push(updated)
      }

      const createdEdges: PaperEdge[] = []
      const createdNodeIds = new Set(createdNodes.map(node => node.id))
      for (const request of input.edges ?? []) {
        const sourceId = resolveEndpoint(request.source)
        const targetId = resolveEndpoint(request.target)
        if (!nodesById.has(sourceId)) throw new Error(`paper edge source '${request.source}' does not resolve in this project`)
        if (!nodesById.has(targetId)) throw new Error(`paper edge target '${request.target}' does not resolve in this project`)
        if (caller.origin === 'subagent' && !createdNodeIds.has(sourceId) && !createdNodeIds.has(targetId)) {
          throw new Error('subagent edges must involve a node created in the same mutation')
        }
        createdEdges.push({
          id: allocateEdgeId(),
          projectId: project.projectId,
          kind: request.kind,
          sourceId,
          targetId,
          createdBySessionId: caller.sessionId,
          createdAt: now,
        })
      }

      if (subagentTaskId !== undefined) {
        for (const node of createdNodes) {
          createdEdges.push({
            id: allocateEdgeId(),
            projectId: project.projectId,
            kind: 'produces',
            sourceId: subagentTaskId,
            targetId: node.id,
            createdBySessionId: caller.sessionId,
            createdAt: now,
          })
        }
      }

      const allBeforeAutomaticEdges = [...edges, ...createdEdges]
      for (const node of createdNodes) {
        const contained = allBeforeAutomaticEdges.some(edge => edge.kind === 'contains' && edge.targetId === node.id)
        if (contained) continue
        const edge: PaperEdge = {
          id: allocateEdgeId(),
          projectId: project.projectId,
          kind: 'contains',
          sourceId: project.rootNodeId,
          targetId: node.id,
          createdBySessionId: caller.sessionId,
          createdAt: now,
        }
        createdEdges.push(edge)
        allBeforeAutomaticEdges.push(edge)
      }

      const revision = project.revision + 1
      const eventId = allocateNodeId('event')
      const affectedNodeIds = new Set([...createdNodes, ...updatedNodes].map(node => node.id))
      for (const edge of createdEdges) {
        for (const nodeId of [edge.sourceId, edge.targetId]) {
          const node = nodesById.get(nodeId)
          if (node !== undefined && node.kind !== 'project' && node.kind !== 'event') affectedNodeIds.add(nodeId)
        }
      }
      for (const nodeId of affectedNodeIds) {
        createdEdges.push({
          id: allocateEdgeId(),
          projectId: project.projectId,
          kind: 'affects',
          sourceId: eventId,
          targetId: nodeId,
          createdBySessionId: caller.sessionId,
          createdAt: now,
        })
      }
      const event = paperNodeSchema.parse({
        id: eventId,
        projectId: project.projectId,
        kind: 'event',
        title: input.operationSummary,
        summary: input.operationSummary,
        status: 'recorded',
        attributes: {
          operationSummary: input.operationSummary,
          callerSessionId: caller.sessionId,
          callerOrigin: caller.origin,
          committedAt: now,
          createdNodeIds: createdNodes.map(node => node.id),
          updatedNodes: updatedNodes.map(node => ({
            id: node.id,
            beforeVersion: node.version - 1,
            afterVersion: node.version,
          })),
          createdEdgeIds: createdEdges.map(edge => edge.id),
          committedRevision: revision,
        },
        version: 1,
        createdBySessionId: caller.sessionId,
        updatedBySessionId: caller.sessionId,
        createdAt: now,
        updatedAt: now,
      }) as PaperNode
      nodesById.set(event.id, event)

      const finalProject: PaperProjectRecord = {
        ...project,
        revision,
        nextNodeSequenceByKind: sequences,
        nextEdgeSequence,
        updatedAt: now,
      }
      const finalNodes = [...nodesById.values()]
      const finalEdges = [...edges, ...createdEdges]
      validatePaperGraph(finalProject, finalNodes, finalEdges)

      const changedNodes = [...createdNodes, ...updatedNodes, event]
      const pending: PendingPaperMutation = {
        mutationId: randomUUID(),
        finalProject,
        nodes: changedNodes as StoredPaperNode[],
        edges: createdEdges as StoredPaperEdge[],
      }
      await this.projects.put(workspaceId, storedPaperProjectRecordSchema.parse({ ...project, pendingMutation: pending }))
      await this.finishOrRecover(workspaceId, pending)

      return {
        projectId: project.projectId,
        revision,
        created: Object.fromEntries(createdRefs),
        updated: updatedNodes.map(node => ({ id: node.id, version: node.version })),
        edgeIds: createdEdges.map(edge => edge.id),
        eventId,
      }
    })
  }

  private async initialize(): Promise<void> {
    for (const [workspaceId, record] of this.projects.entries()) await this.recoverRecord(workspaceId, record)
    for (const [workspaceId] of this.projects.entries()) this.rebuildSnapshot(workspaceId)
    this.initialized = true
  }

  private async recoverRecord(workspaceId: string, record: StoredPaperProjectRecord): Promise<void> {
    if (record.pendingMutation === undefined) return
    await this.completePending(workspaceId, record.pendingMutation)
    this.rebuildSnapshot(workspaceId)
  }

  private async finishOrRecover(workspaceId: string, pending: PendingPaperMutation): Promise<void> {
    try {
      await this.completePending(workspaceId, pending)
    } catch (firstError) {
      try {
        await this.completePending(workspaceId, pending)
      } catch (recoveryError) {
        throw new AggregateError(
          [firstError, recoveryError],
          `paper mutation '${pending.mutationId}' failed and remains recoverable`,
        )
      }
    }
    this.rebuildSnapshot(workspaceId)
  }

  private async completePending(workspaceId: string, pending: PendingPaperMutation): Promise<void> {
    for (const node of pending.nodes) {
      await this.nodes.put(physicalNodeKey(node.projectId, node.id), node)
    }
    for (const edge of pending.edges) {
      await this.edges.put(physicalEdgeKey(edge.projectId, edge.id), edge)
    }
    await this.projects.put(workspaceId, storedPaperProjectRecordSchema.parse(pending.finalProject))
  }

  private rebuildSnapshot(workspaceId: string): void {
    const stored = this.requireProject(workspaceId)
    if (stored.pendingMutation !== undefined) throw new Error(`paper project '${stored.projectId}' still has a pending mutation`)
    const project = committedProject(stored)
    const nodes = [...this.nodes.entries()]
      .filter(([, node]) => node.projectId === project.projectId)
      .map(([, node]) => node as PaperNode)
    const edges = [...this.edges.entries()]
      .filter(([, edge]) => edge.projectId === project.projectId)
      .map(([, edge]) => edge as PaperEdge)
    validatePaperGraph(project, nodes, edges)
    const root = nodes.find(node => node.id === project.rootNodeId)
    if (root === undefined) throw new Error(`paper project '${project.projectId}' has no root node`)
    this.snapshots.set(workspaceId, {
      projectId: project.projectId,
      workspaceId,
      revision: project.revision,
      root,
      nodes,
      edges,
    })
  }

  private requireProject(workspaceId: string): StoredPaperProjectRecord {
    const project = this.projects.get(workspaceId)
    if (project === undefined) throw new PaperProjectNotFoundError(workspaceId)
    return project
  }

  private requireSnapshot(workspaceId: string): PaperProjectSnapshot {
    const snapshot = this.snapshots.get(workspaceId)
    if (snapshot === undefined) throw new PaperProjectNotFoundError(workspaceId)
    return snapshot
  }

  private assertInitialized(): void {
    if (!this.initialized) throw new Error('paper project store is not initialized')
  }

  private enqueue<T>(workspaceId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(workspaceId) ?? Promise.resolve()
    const result = previous.then(operation, operation)
    const tail = result.then(() => undefined, () => undefined)
    this.queues.set(workspaceId, tail)
    void tail.then(() => {
      if (this.queues.get(workspaceId) === tail) this.queues.delete(workspaceId)
    })
    return result
  }
}
