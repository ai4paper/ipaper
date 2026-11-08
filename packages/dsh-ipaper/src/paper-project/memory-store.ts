import { lstat, readlink, stat } from 'node:fs/promises'
import { dirname, relative, resolve, isAbsolute, parse, sep } from 'node:path'
import type { Domain, DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { PaperProjectStore } from './legacy/store.js'
import type { PaperProjectRecord, PaperProjectSnapshot } from './legacy/types.js'
import { memoryDomainSpec, memoryMutationSchema, memoryRecordSchema, memorySnapshotSchema, rejectLegacyPayload } from './memory-spec.js'
import type { MemoryCaller, MemoryMutationInput, MemoryMutationResult, MemoryRecord, MemoryReference, MemorySnapshot } from './memory-spec.js'

function inside(root: string, path: string): void {
  const rel = relative(root, path)
  if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error('file path must remain inside the workspace')
}

/** Resolve links even when their targets are missing; bound cycles and link chains. */
async function resolveMemoryPath(path: string, checkLink?: (path: string) => void): Promise<string> {
  let links = 0
  async function walk(absolute: string): Promise<string> {
    const root = parse(absolute).root
    let current = root
    for (const part of absolute.slice(root.length).split(sep)) {
      if (!part || part === '.') continue
      if (part === '..') { current = dirname(current); continue }
      const candidate = resolve(current, part)
      try {
        if ((await lstat(candidate)).isSymbolicLink()) {
          if (++links > 40) throw new Error('file path contains a symlink loop or excessive link chain')
          const target = await readlink(candidate)
          current = await walk(isAbsolute(target) ? target : `${current}${sep}${target}`)
          checkLink?.(current)
          continue
        }
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
      }
      current = candidate
    }
    return current
  }
  return await walk(path)
}

/** Missing targets are allowed only when symlink destinations stay in the workspace. */
export async function checkMemoryPath(workspacePath: string, path: string): Promise<'exists' | 'missing'> {
  if (isAbsolute(path)) throw new Error('file path must be workspace-relative')
  const root = resolve(workspacePath)
  const absolute = resolve(root, path)
  inside(root, absolute)
  const canonicalRoot = await resolveMemoryPath(root)
  const actual = await resolveMemoryPath(`${canonicalRoot}${sep}${path}`, target => inside(canonicalRoot, target))
  inside(canonicalRoot, actual)
  try { await stat(actual); return 'exists' } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return 'missing'
    throw error
  }
}

function migrate(project: PaperProjectRecord, graph: PaperProjectSnapshot): MemorySnapshot {
  const scopedId = (id: string): string => `${project.projectId}:${id}`
  const records: MemoryRecord[] = graph.nodes.filter(node => node.kind !== 'project' && node.kind !== 'event').map(node => {
    const kind = node.kind === 'source' ? 'source' : ['evidence', 'claim'].includes(node.kind) ? 'finding' : 'note'
    const references: MemoryReference[] = []
    if (node.kind === 'artifact' && node.attributes.path?.trim()) references.push({ kind: 'file', path: node.attributes.path.trim() })
    for (const edge of graph.edges.filter(edge => edge.sourceId === node.id)) {
      const target = graph.nodes.find(item => item.id === edge.targetId)
      if (target === undefined || target.kind === 'project' || target.kind === 'event') continue
      const locator = node.kind === 'evidence' && node.attributes.locator?.trim() ? { locator: node.attributes.locator.trim() } : {}
      if (edge.kind === 'derived_from' && target.kind === 'source') references.push({ kind: 'origin', recordId: scopedId(target.id), ...locator })
      else if (edge.kind === 'derived_from' && target.kind === 'artifact' && target.attributes.path?.trim()) {
        references.push({ kind: 'origin', path: target.attributes.path.trim(), ...locator })
        references.push({ kind: 'related', recordId: scopedId(target.id), explanation: edge.kind })
      } else references.push({ kind: 'related', recordId: scopedId(target.id), explanation: edge.kind })
    }
    return {
      id: scopedId(node.id), projectId: node.projectId, kind, title: node.title.trim() || `Legacy ${node.kind} (${node.id})`,
      text: kind === 'source' ? node.summary : `${node.summary}\n\nLegacy ${node.kind} (${node.status}).\n${JSON.stringify(node.attributes, null, 2)}`,
      archived: node.status === 'archived', unresolved: false,
      quotation: node.kind === 'evidence' && node.attributes.verbatim && references.some(ref => ref.kind === 'origin' && ref.locator !== undefined),
      uncertainty: kind === 'finding' ? `Migrated ${node.kind} with legacy status '${node.status}'; not independently verified by migration.${node.kind === 'evidence' && node.attributes.verbatim && !references.some(ref => ref.kind === 'origin' && ref.locator !== undefined) ? ' Legacy quotation lacks an origin; inspect before marking as quotation.' : ''}` : '',
      ...(node.kind === 'source' ? { source: {
        inspection: (['inspected', 'verified'].includes(node.status) ? 'inspected' : 'discovered') as 'inspected' | 'discovered',
        inspectedContent: node.summary.trim() || (['inspected', 'verified'].includes(node.status)
          ? `Legacy source was marked '${node.status}', but no description of inspected content was recorded. Migration did not inspect the source.` : ''),
        ...(node.attributes.doi === undefined ? {} : { doi: node.attributes.doi }),
        ...(node.attributes.url === undefined ? {} : { url: node.attributes.url }),
        ...(node.attributes.citationKey?.trim() ? { citationKey: node.attributes.citationKey.trim() } : {}),
        bibliographicMetadata: JSON.stringify(node.attributes),
      } } : {}),
      references, version: node.version, createdAt: node.createdAt, updatedAt: node.updatedAt,
      createdBySessionId: node.createdBySessionId, updatedBySessionId: node.updatedBySessionId, legacy: node,
    }
  })
  return memorySnapshotSchema.parse({
    project: { formatVersion: 2, projectId: project.projectId, workspaceId: project.workspaceId, workspacePath: project.workspacePath,
      revision: project.revision, nextSequence: 1, createdAt: project.createdAt, updatedAt: project.updatedAt },
    records, history: [], legacySnapshot: { project, graph },
  })
}

export class MemoryStore {
  private readonly snapshots = new Map<string, MemorySnapshot>()
  private readonly queues = new Map<string, Promise<unknown>>()
  private readonly projects

  private constructor(private readonly domain: Domain<typeof memoryDomainSpec>) {
    this.projects = domain.table('projects')
  }

  static async open(facility: DomainFacility): Promise<MemoryStore> {
    const domain = await facility.open(memoryDomainSpec)
    const store = new MemoryStore(domain)
    try {
      for (const [id, value] of store.projects.entries()) store.snapshots.set(id, memorySnapshotSchema.parse(value))
      // The legacy store finishes pending graph commits before migration. It is
      // closed before exposing memory tools; legacy data is never mutated by them.
      const legacy = await PaperProjectStore.open(facility)
      try {
        for (const project of legacy.listProjects()) {
          if (store.snapshots.has(project.workspaceId)) continue
          const graph = legacy.getSnapshot(project.workspaceId)
          if (graph === undefined) throw new Error('legacy project snapshot is missing')
          await store.commit(migrate(project, graph))
        }
      } finally { await legacy.close() }
      return store
    } catch (error) { await domain.close(); throw error }
  }

  async close(): Promise<void> {
    await Promise.allSettled(this.queues.values())
    await this.domain.close()
  }

  listProjects(): MemorySnapshot['project'][] {
    return [...this.snapshots.values()].map(snapshot => structuredClone(snapshot.project))
  }

  getSnapshot(workspaceId: string): MemorySnapshot | undefined {
    const snapshot = this.snapshots.get(workspaceId)
    return snapshot === undefined ? undefined : structuredClone(snapshot)
  }

  private async enqueue<T>(id: string, run: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(id) ?? Promise.resolve()
    const next = previous.catch(() => {}).then(run)
    this.queues.set(id, next)
    try { return await next } finally { if (this.queues.get(id) === next) this.queues.delete(id) }
  }

  private async commit(snapshot: MemorySnapshot): Promise<void> {
    await this.projects.put(snapshot.project.workspaceId, snapshot)
    this.snapshots.set(snapshot.project.workspaceId, structuredClone(snapshot))
  }

  async ensurePaperProject(workspaceId: string, workspacePath: string, _sessionId: string): Promise<MemorySnapshot> {
    return await this.enqueue(workspaceId, async () => {
      const existing = this.snapshots.get(workspaceId)
      if (existing !== undefined) {
        if (existing.project.workspacePath !== workspacePath) throw new Error('workspace path changed')
        return structuredClone(existing)
      }
      const now = new Date().toISOString()
      const snapshot: MemorySnapshot = { project: { formatVersion: 2, projectId: `paper-${workspaceId}`, workspaceId, workspacePath,
        revision: 0, nextSequence: 1, createdAt: now, updatedAt: now }, records: [], history: [] }
      await this.commit(snapshot)
      return structuredClone(snapshot)
    })
  }

  async record(workspaceId: string, caller: MemoryCaller, raw: MemoryMutationInput): Promise<MemoryMutationResult> {
    rejectLegacyPayload(raw)
    const input = memoryMutationSchema.parse(raw)
    if (caller.origin === 'subagent' && (input.updates?.length ?? 0) > 0) throw new Error('subagents may append records only')
    return await this.enqueue(workspaceId, async () => {
      const current = this.snapshots.get(workspaceId)
      if (current === undefined) throw new Error('workspace memory does not exist')
      const snapshot = structuredClone(current)
      const now = new Date().toISOString()
      const aliases = new Map<string, string>()
      const before: MemoryRecord[] = []
      const after: MemoryRecord[] = []
      for (const item of input.records ?? []) {
        if (/^memory-\d+$/.test(item.ref) || aliases.has(item.ref) || snapshot.records.some(record => record.id === item.ref)) throw new Error('duplicate or ambiguous record alias')
        let id: string
        do { id = `${snapshot.project.projectId}:memory-${snapshot.project.nextSequence++}` } while (snapshot.records.some(record => record.id === id))
        aliases.set(item.ref, id)
      }
      for (const item of input.records ?? []) {
        const { ref, ...fields } = item
        const record = memoryRecordSchema.parse({
          archived: false, unresolved: false, quotation: false, uncertainty: '', references: [],
          ...(item.kind === 'source' ? { source: { inspection: 'discovered' as const } } : {}),
          ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
          id: aliases.get(ref)!, projectId: snapshot.project.projectId, version: 1,
          createdAt: now, updatedAt: now, createdBySessionId: caller.sessionId, updatedBySessionId: caller.sessionId,
        })
        snapshot.records.push(record)
        after.push(record)
      }
      const updated = new Set<string>()
      for (const item of input.updates ?? []) {
        if (updated.has(item.id)) throw new Error('duplicate record update')
        updated.add(item.id)
        const index = snapshot.records.findIndex(record => record.id === item.id)
        const old = current.records.find(record => record.id === item.id)
        if (old === undefined) throw new Error(`record '${item.id}' is not in this project`)
        if (old.version !== item.expectedVersion) throw new Error(`record '${item.id}' version conflict: current version is ${old.version}`)
        const { id: _, expectedVersion: __, ...fields } = item
        const record = memoryRecordSchema.parse({ ...old,
          ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
          version: old.version + 1, updatedAt: now, updatedBySessionId: caller.sessionId })
        before.push(old)
        after.push(record)
        snapshot.records[index] = record
      }
      for (const record of after) {
        if (record.kind !== 'source' && record.source !== undefined) throw new Error('source metadata requires a source record')
        if (record.kind === 'source' && record.source?.inspection === 'inspected' && !record.source.inspectedContent?.trim()) throw new Error('inspected sources require inspectedContent')
        if (record.kind !== 'finding' && record.quotation) throw new Error('only findings can be quotations')
        if (record.kind === 'source' && record.unresolved) throw new Error('unresolved is for findings and notes')
        record.references = record.references.map(ref => 'recordId' in ref && ref.recordId !== undefined
          ? { ...ref, recordId: aliases.get(ref.recordId) ?? ref.recordId } : ref)
        for (const ref of record.references) {
          if ('recordId' in ref && ref.recordId !== undefined) {
            const target = snapshot.records.find(item => item.id === ref.recordId)
            if (target === undefined) throw new Error(`reference '${ref.recordId}' is not in this project`)
            if (ref.kind === 'origin' && target.kind !== 'source') throw new Error('record origins must reference sources')
          }
          if ('path' in ref && ref.path !== undefined) await checkMemoryPath(snapshot.project.workspacePath, ref.path)
        }
        if (record.quotation && !record.references.some(ref => ref.kind === 'origin' && ref.locator?.trim())) throw new Error('quotation requires an origin and precise locator')
      }
      snapshot.project.revision++
      snapshot.project.updatedAt = now
      snapshot.history.push({ revision: snapshot.project.revision, sessionId: caller.sessionId, origin: caller.origin, timestamp: now, before, after })
      await this.commit(memorySnapshotSchema.parse(snapshot))
      return { projectId: snapshot.project.projectId, revision: snapshot.project.revision,
        created: Object.fromEntries(aliases), updated: after.filter(record => updated.has(record.id)).map(({ id, version }) => ({ id, version })) }
    })
  }
}
