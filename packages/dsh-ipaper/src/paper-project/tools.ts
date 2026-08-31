import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { PaperProjectService } from './service.js'
import { PAPER_EDGE_KINDS, PAPER_NODE_KINDS } from './types.js'
import type { PaperMutationInput, PaperStateInput } from './types.js'

const MUTABLE_NODE_KINDS = PAPER_NODE_KINDS.filter(kind => kind !== 'project' && kind !== 'event')

const nodeInputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ref: { type: 'string', required: true, description: 'Unique call-local alias used by edges in this batch.' },
    kind: { type: 'string', enum: MUTABLE_NODE_KINDS, required: true },
    title: { type: 'string', required: true },
    summary: { type: 'string' },
    status: { type: 'string', description: 'Kind-specific status. Omit for the kind default.' },
    attributes: { type: 'json', description: 'Kind-specific attributes; unknown fields are rejected.' },
  },
} as const

const updateInputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', required: true },
    expectedVersion: { type: 'integer', required: true, description: 'Current version returned by ipaper_state.' },
    title: { type: 'string' },
    summary: { type: 'string' },
    status: { type: 'string' },
    attributesPatch: { type: 'json', description: 'Object merged into the existing kind-specific attributes.' },
  },
} as const

const edgeInputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    source: { type: 'string', required: true, description: 'Existing node ID or call-local ref.' },
    kind: { type: 'string', enum: PAPER_EDGE_KINDS, required: true },
    target: { type: 'string', required: true, description: 'Existing node ID or call-local ref.' },
  },
} as const

function mutationSummary(input: { nodes?: readonly unknown[]; updates?: readonly unknown[]; edges?: readonly unknown[] }): string {
  return `Record paper graph batch: create ${String(input.nodes?.length ?? 0)}, update ${String(input.updates?.length ?? 0)}, relate ${String(input.edges?.length ?? 0)}.`
}

function jsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

export function createIPaperRecordTool(service: PaperProjectService): ToolDefinition {
  return defineTool({
    name: 'ipaper_record',
    description: 'Atomically record scholarly nodes, optimistic-version updates, and provenance edges in the current workspace Paper Project Graph. Use call-local refs to connect nodes created together. Root agents may create and update model-owned nodes. Subagents must provide their delegated taskId, may append only source/evidence/proposed-claim/artifact/review/note checkpoints, and cannot update existing nodes.',
    parameters: {
      taskId: { type: 'string', description: 'Required for a subagent: the existing delegated task node ID.' },
      nodes: { type: 'array', items: nodeInputSchema },
      updates: { type: 'array', items: updateInputSchema },
      edges: { type: 'array', items: edgeInputSchema },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          projectId: { type: 'string', required: true },
          revision: { type: 'integer', required: true },
          created: { type: 'object', additionalProperties: true, required: true },
          updated: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string', required: true },
                version: { type: 'integer', required: true },
              },
            },
          },
          edgeIds: { type: 'array', required: true, items: { type: 'string' } },
          eventId: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      if (exec.agent === undefined) throw new Error('ipaper_record requires a calling agent')
      const input: PaperMutationInput = {
        operationSummary: mutationSummary(args),
        ...(args.taskId === undefined ? {} : { taskId: args.taskId }),
        ...(args.nodes === undefined ? {} : { nodes: args.nodes }),
        ...(args.updates === undefined ? {} : { updates: args.updates }),
        ...(args.edges === undefined ? {} : { edges: args.edges }),
      }
      const result = await service.recordForAgent(exec.agent, input, exec.signal)
      return {
        projectId: result.projectId,
        revision: result.revision,
        created: { ...result.created },
        updated: result.updated.map(item => ({ ...item })),
        edgeIds: [...result.edgeIds],
        eventId: result.eventId,
      }
    },
  })
}

export function createIPaperStateTool(service: PaperProjectService): ToolDefinition {
  return defineTool({
    name: 'ipaper_state',
    description: 'Read a compact view of the current workspace Paper Project Graph. Defaults to overview. Use graph for filtered nodes, related for one node neighborhood, and history for immutable mutation events. Follow returned cursors for later pages.',
    parameters: {
      view: { type: 'string', enum: ['overview', 'graph', 'related', 'history'], default: 'overview' },
      nodeId: { type: 'string', description: "Required by 'related'; optional history filter." },
      kinds: { type: 'array', items: { type: 'string', enum: PAPER_NODE_KINDS } },
      statuses: { type: 'array', items: { type: 'string' } },
      query: { type: 'string', description: 'Case-insensitive ID, title, and summary search.' },
      cursor: { type: 'string' },
      limit: { type: 'integer', description: 'Page size from 1 to 100.' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      if (exec.agent === undefined) throw new Error('ipaper_state requires a calling agent')
      const input: PaperStateInput = {
        ...(args.view === undefined ? {} : { view: args.view }),
        ...(args.nodeId === undefined ? {} : { nodeId: args.nodeId }),
        ...(args.kinds === undefined ? {} : { kinds: args.kinds }),
        ...(args.statuses === undefined ? {} : { statuses: args.statuses }),
        ...(args.query === undefined ? {} : { query: args.query }),
        ...(args.cursor === undefined ? {} : { cursor: args.cursor }),
        ...(args.limit === undefined ? {} : { limit: args.limit }),
      }
      return jsonValue(await service.stateForAgent(exec.agent, input, exec.signal))
    },
  })
}

export const name = 'paper-project-tools'
export const inject = ['tools', 'paperProjects']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.tools.register(createIPaperRecordTool(ctx.paperProjects)), 'ipaper.ipaperRecordTool()')
  ctx.effect(() => ctx.tools.register(createIPaperStateTool(ctx.paperProjects)), 'ipaper.ipaperStateTool()')
}
