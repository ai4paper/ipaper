import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionRpcResult as RpcResult, PeerScope } from '@deepseek-ai/dsh-client-connection'
import { deriveMemorySummary } from './paper-project/memory-derive.js'
import type {} from './paper-project/service.js'
import type { PaperProjectStatus } from './paper-project/memory-view-types.js'
import type { MemorySnapshot } from './paper-project/memory-spec.js'

export const IPAPER_RPC_CHANNEL = '/ipaper'
export const IPAPER_STATUS_ENDPOINT = 'paper-project/status'

export type { PaperProjectStatus } from './paper-project/memory-view-types.js'

interface PaperProjectStatusSource {
  statusSnapshot(workspaceId: string): Promise<MemorySnapshot | undefined>
}

function badRequest(message: string): RpcResult<never> {
  return {
    ok: false,
    error: {
      code: 'bad-request',
      message,
      details: { issues: [] },
    },
  }
}

/** Return a bounded workspace summary without exposing storage or legacy snapshots. */
export async function paperProjectStatus(
  source: PaperProjectStatusSource,
  workspaceId: string,
): Promise<PaperProjectStatus | null> {
  const snapshot = await source.statusSnapshot(workspaceId)
  if (snapshot === undefined) return null
  return { summary: deriveMemorySummary(snapshot) }
}

/** Build the trusted browser RPC handler independently for focused tests. */
export function createPaperProjectRpcHandler(source: PaperProjectStatusSource): (
  endpoint: string, payload: unknown, signal: AbortSignal, peer: Pick<PeerScope, 'principal'>,
) => Promise<RpcResult<unknown>> {
  return async (endpoint, payload, _signal, peer) => {
    if (peer.principal.kind !== 'owner') {
      return { ok: false, error: { code: 'forbidden', message: 'Paper status requires the host owner', details: {} } }
    }
    if (endpoint !== IPAPER_STATUS_ENDPOINT) return badRequest(`unknown IPaper endpoint '${endpoint}'`)
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return badRequest('IPaper status requires an object payload')
    }
    const workspaceId = Reflect.get(payload, 'workspaceId')
    if (typeof workspaceId !== 'string' || workspaceId.trim() === '') {
      return badRequest('IPaper status requires workspaceId')
    }
    return { ok: true, value: await paperProjectStatus(source, workspaceId) }
  }
}

export const inject = ['connection', 'paperProjects', 'webServer']

/** Expose shared research memory to the product browser status plane. */
export function apply(ctx: Context): void {
  const handler = createPaperProjectRpcHandler(ctx.paperProjects)
  // Connection owns registration disposal in the calling plugin's scope.
  ctx.connection.rpc.handle(IPAPER_RPC_CHANNEL, handler)
}
