import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'

const text = z.string().trim().min(1)
// Host identities and workspace paths are opaque legacy-compatible values.
const identity = z.string().min(1)
export const MEMORY_KINDS = ['source', 'finding', 'note'] as const
const reference = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('origin'), recordId: identity.optional(), path: text.optional(), locator: text.optional() }).strict()
    .refine(value => (value.recordId === undefined) !== (value.path === undefined), 'origin requires exactly one recordId or path'),
  z.object({ kind: z.literal('related'), recordId: identity, explanation: text.optional() }).strict(),
  z.object({ kind: z.literal('file'), path: text, locator: text.optional() }).strict(),
])
const source = z.object({
  inspection: z.enum(['discovered', 'inspected']),
  inspectedContent: z.string().optional(),
  doi: z.string().regex(/^10\.\d{4,9}\/\S+$/i).optional(),
  url: z.url().optional(),
  citationKey: text.optional(),
  bibliographicMetadata: z.string().optional(),
}).strict()
const content = z.object({
  title: text,
  text: z.string(),
  archived: z.boolean(),
  unresolved: z.boolean(),
  quotation: z.boolean(),
  uncertainty: z.string(),
  source: source.optional(),
  references: z.array(reference),
}).strict()

const editable = content.extend({ title: text.max(1000), text: z.string().max(50000),
  uncertainty: z.string().max(5000), references: z.array(reference).max(100) })
export const memoryCreateSchema = editable.partial().extend({
  ref: text.regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/),
  kind: z.enum(MEMORY_KINDS),
  title: editable.shape.title,
  text: editable.shape.text,
}).strict()
export const memoryUpdateSchema = editable.partial().extend({ id: identity, expectedVersion: z.number().int().positive() }).strict()
export const memoryMutationSchema = z.object({
  records: z.array(memoryCreateSchema).max(50).optional(),
  updates: z.array(memoryUpdateSchema).max(50).optional(),
}).strict().refine(input => (input.records?.length ?? 0) + (input.updates?.length ?? 0) > 0, 'batch must contain records or updates')

export const memoryRecordSchema = content.extend({
  id: identity,
  projectId: identity,
  kind: z.enum(MEMORY_KINDS),
  version: z.number().int().positive(),
  createdAt: text,
  updatedAt: text,
  createdBySessionId: identity,
  updatedBySessionId: identity,
  // Host-only migration data preserves the full original semantic node.
  legacy: z.unknown().optional(),
}).strict()
const project = z.object({
  formatVersion: z.literal(2), projectId: identity, workspaceId: identity, workspacePath: identity,
  revision: z.number().int().nonnegative(), nextSequence: z.number().int().positive(),
  createdAt: text, updatedAt: text,
}).strict()
const change = z.object({
  revision: z.number().int().nonnegative(), sessionId: identity,
  origin: z.enum(['root', 'subagent', 'host']), timestamp: text,
  before: z.array(memoryRecordSchema), after: z.array(memoryRecordSchema),
}).strict()
export const memorySnapshotSchema = z.object({
  project, records: z.array(memoryRecordSchema), history: z.array(change),
  legacySnapshot: z.unknown().optional(),
}).strict()
export const memoryStateSchema = z.object({
  view: z.enum(['summary', 'search', 'record', 'history']).optional(),
  recordId: identity.optional(), kinds: z.array(z.enum(MEMORY_KINDS)).optional(),
  query: z.string().optional(), cursor: text.optional(),
  limit: z.number().int().min(1).max(100).optional(),
  includeArchived: z.boolean().optional(),
}).strict()

export type MemoryRecord = z.infer<typeof memoryRecordSchema>
export type MemoryReference = MemoryRecord['references'][number]
export type MemorySnapshot = z.infer<typeof memorySnapshotSchema>
export type MemoryProject = MemorySnapshot['project']
export type MemoryMutationInput = z.infer<typeof memoryMutationSchema>
export type MemoryStateInput = z.infer<typeof memoryStateSchema>
export interface MemoryCaller {
  readonly sessionId: string
  readonly origin: 'root' | 'subagent' | 'host'
}
export interface MemoryMutationResult {
  readonly projectId: string
  readonly revision: number
  readonly created: Readonly<Record<string, string>>
  readonly updated: readonly { readonly id: string; readonly version: number }[]
}

// A complete workspace revision is one atomic storage primitive. No partial batch
// or migration can become visible, including after a host restart.
export const memoryDomainSpec = defineDomain({
  name: 'ipaper_memory', version: 1,
  tables: { projects: domainTable<string, MemorySnapshot>(memorySnapshotSchema) },
})

export function rejectLegacyPayload(input: unknown): void {
  if (typeof input !== 'object' || input === null) return
  if (['nodes', 'edges', 'taskId', 'nodeId', 'statuses'].some(key => key in input)
    || ('updates' in input && Array.isArray(input.updates) && input.updates.some(item =>
      typeof item === 'object' && item !== null && ['summary', 'status', 'attributesPatch'].some(key => key in item)))
    || ('view' in input && ['overview', 'graph', 'related'].includes(String(input.view)))) {
    throw new Error('Legacy Paper Project Graph payload is no longer supported. Use records (source, finding, note) and summary/search/record/history views.')
  }
}
