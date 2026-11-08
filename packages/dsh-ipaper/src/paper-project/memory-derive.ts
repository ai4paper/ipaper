import { createHash } from 'node:crypto'
import { memoryStateSchema, rejectLegacyPayload } from './memory-spec.js'
import type { MemoryRecord, MemoryReference, MemorySnapshot, MemoryStateInput } from './memory-spec.js'
import { checkMemoryPath } from './memory-store.js'
import type { MemoryRecordSummary, MemorySummary } from './memory-view-types.js'

export function memoryRecordSummary(record: MemoryRecord): MemoryRecordSummary {
  return { id: record.id, kind: record.kind, title: record.title.slice(0, 1000), text: record.text.slice(0, 400),
    version: record.version, archived: record.archived, unresolved: record.unresolved, updatedAt: record.updatedAt }
}

export function deriveMemorySummary(snapshot: MemorySnapshot): MemorySummary {
  const records = snapshot.records.filter(record => !record.archived)
  const recent = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
  const unresolved = records.filter(record => record.unresolved)
  return { view: 'summary' as const, projectId: snapshot.project.projectId, workspaceId: snapshot.project.workspaceId,
    revision: snapshot.project.revision, counts: {
      source: records.filter(record => record.kind === 'source').length,
      finding: records.filter(record => record.kind === 'finding').length,
      note: records.filter(record => record.kind === 'note').length,
    }, recent: recent.slice(0, 10).map(memoryRecordSummary), unresolvedCount: unresolved.length,
    unresolved: unresolved.slice(0, 10).map(memoryRecordSummary) }
}

interface MemoryPage {
  readonly projectId: string
  readonly workspaceId: string
  readonly revision: number
  readonly cursor?: string
}

export type MemoryStateResult = MemorySummary
  | (MemoryPage & { readonly view: 'search'; readonly records: readonly MemoryRecordSummary[] })
  | (MemoryPage & { readonly view: 'record'; readonly migrated: boolean;
    readonly record: Omit<MemoryRecord, 'legacy' | 'references'> & {
      readonly references: readonly (MemoryReference & { readonly pathStatus?: 'exists' | 'missing'; readonly pathCheckedAt?: string })[]
    }; readonly referencing: readonly MemoryRecordSummary[] })
  | (MemoryPage & { readonly view: 'history'; readonly legacyHistoryAvailable: boolean;
    readonly changes: readonly (Omit<MemorySnapshot['history'][number], 'before' | 'after'> & {
      readonly before: readonly MemoryRecordSummary[]; readonly after: readonly MemoryRecordSummary[]
    })[] })

export async function deriveMemoryState(snapshot: MemorySnapshot, raw: MemoryStateInput = {}): Promise<MemoryStateResult> {
  rejectLegacyPayload(raw)
  const input = memoryStateSchema.parse(raw)
  const view = input.view ?? 'summary'
  if (view === 'summary') return deriveMemorySummary(snapshot)
  const { cursor: _, ...filter } = input
  const signature = createHash('sha256').update(JSON.stringify([snapshot.project.projectId, snapshot.project.revision, filter])).digest('hex').slice(0, 24)
  let offset = 0
  if (input.cursor !== undefined) {
    const [hash, position] = input.cursor.split(':')
    if (hash !== signature || !/^\d+$/.test(position ?? '')) throw new Error('invalid or stale cursor; restart this query')
    offset = Number(position)
    if (!Number.isSafeInteger(offset)) throw new Error('invalid cursor')
  }
  const limit = input.limit ?? 20
  const page = <T>(items: readonly T[]): { items: T[]; cursor?: string } => ({
    items: items.slice(offset, offset + limit),
    ...(offset + limit < items.length ? { cursor: `${signature}:${offset + limit}` } : {}),
  })
  const base = { projectId: snapshot.project.projectId, workspaceId: snapshot.project.workspaceId, revision: snapshot.project.revision }
  if (view === 'history') {
    const changes = snapshot.history.filter(change => input.recordId === undefined || change.after.some(record => record.id === input.recordId)).slice().reverse()
    const result = page(changes)
    return { ...base, view, changes: result.items.map(change => ({ ...change,
      before: change.before.map(memoryRecordSummary), after: change.after.map(memoryRecordSummary) })),
      legacyHistoryAvailable: snapshot.legacySnapshot !== undefined,
      ...(result.cursor === undefined ? {} : { cursor: result.cursor }) }
  }
  if (view === 'record') {
    if (input.recordId === undefined) throw new Error('record view requires recordId')
    const record = snapshot.records.find(item => item.id === input.recordId)
    if (record === undefined) throw new Error('record is not in this project')
    const { legacy: _, ...publicRecord } = record
    const references = await Promise.all(record.references.map(async ref => 'path' in ref && ref.path !== undefined
      ? { ...ref, pathStatus: await checkMemoryPath(snapshot.project.workspacePath, ref.path), pathCheckedAt: new Date().toISOString() } : ref))
    const referencing = page(snapshot.records.filter(item => (input.includeArchived || !item.archived)
      && item.references.some(ref => 'recordId' in ref && ref.recordId === record.id)))
    return { ...base, view, record: { ...publicRecord, references }, migrated: record.legacy !== undefined,
      referencing: referencing.items.map(memoryRecordSummary), ...(referencing.cursor === undefined ? {} : { cursor: referencing.cursor }) }
  }
  const query = input.query?.toLowerCase()
  const result = page(snapshot.records.filter(record => (input.includeArchived || !record.archived)
    && (input.kinds === undefined || input.kinds.includes(record.kind))
    && (query === undefined || `${record.id} ${record.title} ${record.text}`.toLowerCase().includes(query))))
  return { ...base, view, records: result.items.map(memoryRecordSummary), ...(result.cursor === undefined ? {} : { cursor: result.cursor }) }
}
