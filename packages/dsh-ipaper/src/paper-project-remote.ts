import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy'
import { deriveOverview, deriveProblemMap } from './paper-project/derive.js'
import type {} from './paper-project/service.js'
import type { PaperProblemMap, PaperProjectOverview, PaperProjectSnapshot } from './paper-project/types.js'

export const IPAPER_RPC_CHANNEL = '/ipaper'
export const IPAPER_STATUS_ENDPOINT = 'paper-project/status'

export interface PaperProjectStatus {
  readonly snapshot: PaperProjectSnapshot
  readonly overview: PaperProjectOverview
  readonly problemMap: PaperProblemMap
}

interface PaperProjectStatusSource {
  getSnapshot(workspaceId: string): PaperProjectSnapshot | undefined
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

/** Resolve one workspace-owned graph into the complete read-only status payload. */
export function paperProjectStatus(
  source: PaperProjectStatusSource,
  workspaceId: string,
): PaperProjectStatus | null {
  const snapshot = source.getSnapshot(workspaceId)
  if (snapshot === undefined) return null
  return { snapshot, overview: deriveOverview(snapshot), problemMap: deriveProblemMap(snapshot) }
}

/** Build the trusted browser RPC handler independently for focused tests. */
export function createPaperProjectRpcHandler(source: PaperProjectStatusSource) {
  return async (endpoint: string, payload: unknown): Promise<RpcResult<unknown>> => {
    if (endpoint !== IPAPER_STATUS_ENDPOINT) return badRequest(`unknown IPaper endpoint '${endpoint}'`)
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return badRequest('IPaper status requires an object payload')
    }
    const workspaceId = Reflect.get(payload, 'workspaceId')
    if (typeof workspaceId !== 'string' || workspaceId.trim() === '') {
      return badRequest('IPaper status requires workspaceId')
    }
    return { ok: true, value: paperProjectStatus(source, workspaceId) }
  }
}

export const inject = ['connection', 'paperProjects']

/** Expose the workspace Paper Project Graph to the product browser status plane. */
export function apply(ctx: Context): void {
  const handler = createPaperProjectRpcHandler(ctx.paperProjects)
  ctx.effect(
    () => ctx.connection.rpc.handle(IPAPER_RPC_CHANNEL, handler, { authority: 'trusted-host' }),
    'ipaper.paperProjectRemote',
  )
}
