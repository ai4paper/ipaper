import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-session-persistence'
import type {} from '@deepseek-ai/dsh-workspace'
import { derivePaperState } from './derive.js'
import type {
  PaperMutationCaller,
  PaperMutationInput,
  PaperMutationResult,
  PaperProjectRecord,
  PaperProjectSnapshot,
  PaperStateInput,
  PaperStateResult,
} from './types.js'
import { PaperProjectStore } from './store.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    paperProjects: PaperProjectService
  }
}

export interface ResolvedPaperWorkspace {
  readonly workspaceId: string
  readonly workspacePath: string
  readonly caller: PaperMutationCaller
  readonly snapshot: PaperProjectSnapshot
}

interface ResolvableSessionHeader {
  readonly id: string
  readonly cwd?: string
  readonly parentSession?: string
  readonly origin?: 'subagent'
}

function resolvableHeader(header: ResolvableSessionHeader): ResolvableSessionHeader {
  return {
    id: header.id,
    ...(header.cwd === undefined ? {} : { cwd: header.cwd }),
    ...(header.parentSession === undefined ? {} : { parentSession: header.parentSession }),
    ...(header.origin === undefined ? {} : { origin: header.origin }),
  }
}

async function parentHeader(ctx: Context, id: string, signal?: AbortSignal): Promise<ResolvableSessionHeader | undefined> {
  const live = ctx.agents.list().find(agent => String(agent.id) === id)
  if (live !== undefined) return resolvableHeader(live.session.header)
  const persistence = ctx.get('sessionPersistence')
  if (persistence === undefined) return undefined
  const persisted = (await persistence.list(signal)).find(header => String(header.id) === id)
  return persisted === undefined ? undefined : resolvableHeader(persisted)
}

/** Resolve an agent's workspace through its own header or durable parent lineage. */
export async function resolvePaperWorkspace(
  ctx: Context,
  agent: Agent,
  ensure: (workspaceId: string, workspacePath: string, sessionId: string) => Promise<PaperProjectSnapshot>,
  signal?: AbortSignal,
): Promise<ResolvedPaperWorkspace> {
  let header: ResolvableSessionHeader = resolvableHeader(agent.session.header)
  const visited = new Set<string>()
  while (true) {
    signal?.throwIfAborted()
    if (visited.has(header.id)) throw new Error(`session lineage repeats '${header.id}'`)
    visited.add(header.id)
    if (header.cwd !== undefined) {
      const workspace = await ctx.workspaceRegistry.resolveByPath(header.cwd)
      if (workspace === undefined) {
        throw new Error(`session '${agent.id}' directory '${header.cwd}' is not registered as a DSH workspace`)
      }
      const snapshot = await ensure(workspace.id, workspace.path, agent.id)
      return {
        workspaceId: workspace.id,
        workspacePath: workspace.path,
        caller: {
          sessionId: agent.id,
          origin: agent.session.header.origin === 'subagent' ? 'subagent' : 'root',
        },
        snapshot,
      }
    }
    if (header.parentSession === undefined) {
      throw new Error(`session '${agent.id}' has no workspace directory or parent session to resolve`)
    }
    const parent = await parentHeader(ctx, header.parentSession, signal)
    if (parent === undefined) throw new Error(`cannot resolve parent session '${header.parentSession}' for session '${agent.id}'`)
    header = parent
  }
}

/** Singleton host service owning the durable workspace paper graphs. */
export class PaperProjectService extends Service {
  static inject = ['storageDomain', 'workspaceRegistry', 'agents']
  private store?: PaperProjectStore

  constructor(ctx: Context) {
    super(ctx, 'paperProjects')
  }

  protected async [Service.init](): Promise<void> {
    const store = await PaperProjectStore.open(this.ctx.storageDomain)
    this.store = store
    this.ctx.effect(() => () => store.close(), 'ipaper.paperProjectDomainClose')
  }

  listProjects(): readonly PaperProjectRecord[] {
    return this.requireStore().listProjects()
  }

  getSnapshot(workspaceId: string): PaperProjectSnapshot | undefined {
    return this.requireStore().getSnapshot(workspaceId)
  }

  async ensurePaperProject(
    workspaceId: string,
    workspacePath: string,
    createdBySessionId: string,
  ): Promise<PaperProjectSnapshot> {
    return await this.requireStore().ensurePaperProject(workspaceId, workspacePath, createdBySessionId)
  }

  async resolveAgent(agent: Agent, signal?: AbortSignal): Promise<ResolvedPaperWorkspace> {
    return await resolvePaperWorkspace(
      this.ctx,
      agent,
      (workspaceId, workspacePath, sessionId) => this.ensurePaperProject(workspaceId, workspacePath, sessionId),
      signal,
    )
  }

  async record(
    workspaceId: string,
    caller: PaperMutationCaller,
    input: PaperMutationInput,
  ): Promise<PaperMutationResult> {
    return await this.requireStore().record(workspaceId, caller, input)
  }

  async recordForAgent(agent: Agent, input: PaperMutationInput, signal?: AbortSignal): Promise<PaperMutationResult> {
    const resolved = await this.resolveAgent(agent, signal)
    signal?.throwIfAborted()
    return await this.record(resolved.workspaceId, resolved.caller, input)
  }

  async stateForAgent(agent: Agent, input: PaperStateInput = {}, signal?: AbortSignal): Promise<PaperStateResult> {
    const resolved = await this.resolveAgent(agent, signal)
    signal?.throwIfAborted()
    const snapshot = this.getSnapshot(resolved.workspaceId)
    if (snapshot === undefined) throw new Error(`paper project for workspace '${resolved.workspaceId}' was not created`)
    return derivePaperState(snapshot, input)
  }

  private requireStore(): PaperProjectStore {
    if (this.store === undefined) throw new Error('paper project service is not initialized')
    return this.store
  }
}

export default PaperProjectService
