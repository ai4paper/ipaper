import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import type { PaperProjectService } from './service.js'
import { MEMORY_KINDS, memoryMutationSchema, memoryStateSchema, rejectLegacyPayload } from './memory-spec.js'

const fields = {
  title: { type: 'string' }, text: { type: 'string' },
  archived: { type: 'boolean' }, unresolved: { type: 'boolean', description: 'Author-marked unresolved question in a finding or note.' },
  quotation: { type: 'boolean', description: 'Finding is a direct quotation; requires an origin with a precise locator.' },
  uncertainty: { type: 'string', description: 'Describe uncertainty or explicitly identify an unsupported hypothesis.' },
  source: { type: 'object', additionalProperties: false, properties: {
    inspection: { type: 'string', enum: ['discovered', 'inspected'], required: true },
    inspectedContent: { type: 'string', description: 'Required when inspected: describe what was actually read.' },
    doi: { type: 'string' }, url: { type: 'string' }, citationKey: { type: 'string' }, bibliographicMetadata: { type: 'string' },
  } },
  references: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    kind: { type: 'string', enum: ['origin', 'related', 'file'], required: true },
    recordId: { type: 'string', description: 'Existing ID or call-local alias. An origin record must be a source.' },
    path: { type: 'string', description: 'Workspace-relative file path. Origin requires exactly one recordId or path; file requires path.' },
    locator: { type: 'string', description: 'Exact page, section, lines, or other location for an origin or file.' },
    explanation: { type: 'string', description: 'Optional explanation for a related record.' },
  } } },
} as const

function jsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

function withLegacyError(tool: ToolDefinition): ToolDefinition {
  return {
    ...tool,
    async execute(args, exec) {
      rejectLegacyPayload(args)
      return await tool.execute(args, exec)
    },
  }
}

export function createIPaperRecordTool(service: PaperProjectService): ToolDefinition {
  return withLegacyError(defineTool({
    name: 'ipaper_record',
    description: 'Record durable sources, findings, and notes in shared workspace research memory. Creates and updates commit as one batch. Subagents may append only, without a taskId. Use expectedVersion for updates and archived=true to archive. References and source metadata are replaced when supplied. Graph nodes/edges payloads are no longer supported.',
    parameters: {
      records: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
        ...fields, ref: { type: 'string', required: true }, kind: { type: 'string', enum: MEMORY_KINDS, required: true },
        title: { type: 'string', required: true }, text: { type: 'string', required: true },
      } } },
      updates: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
        ...fields, id: { type: 'string', required: true }, expectedVersion: { type: 'integer', required: true },
      } } },
    },
    output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute(args, exec) {
      if (exec.agent === undefined) throw new Error('ipaper_record requires a calling agent')
      rejectLegacyPayload(args)
      return jsonValue(await service.recordForAgent(exec.agent, memoryMutationSchema.parse(args), exec.signal))
    },
  }))
}

export function createIPaperStateTool(service: PaperProjectService): ToolDefinition {
  return withLegacyError(defineTool({
    name: 'ipaper_state',
    description: 'Read shared workspace research memory. Summary gives counts, recent records and author-marked unresolved questions. Search returns bounded snippets; record returns full content and references; history returns change summaries. Follow cursors with the same query; restart after a revision change.',
    parameters: {
      view: { type: 'string', enum: ['summary', 'search', 'record', 'history'], default: 'summary' },
      recordId: { type: 'string', description: 'Required for record; optional history filter.' },
      kinds: { type: 'array', items: { type: 'string', enum: MEMORY_KINDS } },
      query: { type: 'string' }, cursor: { type: 'string' },
      limit: { type: 'integer', description: 'Page size from 1 to 100.' }, includeArchived: { type: 'boolean' },
    },
    output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      if (exec.agent === undefined) throw new Error('ipaper_state requires a calling agent')
      rejectLegacyPayload(args)
      return jsonValue(await service.stateForAgent(exec.agent, memoryStateSchema.parse(args), exec.signal))
    },
  }))
}

export const name = 'paper-project-tools'
export const inject = ['tools', 'paperProjects']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.tools.register(createIPaperRecordTool(ctx.paperProjects)), 'ipaper.ipaperRecordTool()')
  ctx.effect(() => ctx.tools.register(createIPaperStateTool(ctx.paperProjects)), 'ipaper.ipaperStateTool()')
}
