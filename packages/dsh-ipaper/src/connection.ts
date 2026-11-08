import type { Context } from '@deepseek-ai/cordis'
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'

export const inject = ['connection']
export const name = 'ipaper-connection'

export interface Config {
  /** Require browser credentials by default; false admits trusted requests as owner. */
  browserAuth?: { enabled?: boolean }
}

/** Apply the development authentication policy to one upstream service instance. */
export function disableBrowserAuthentication(connection: HostConnectionHandle): () => void {
  const original = {
    admit: connection.admit,
    authorizeIndex: connection.authorizeIndex,
    authenticatedUrl: connection.authenticatedUrl,
  }
  let active = true
  connection.admit = function (request) {
    const admission = original.admit.call(this, request)
    if (!active || !('rejection' in admission) || admission.rejection !== 401) return admission
    return { peer: this.browserPeer }
  }
  connection.authorizeIndex = function (request, response) {
    const rejection = this.requestRejection(request)
    if (rejection === undefined) return true
    response.writeHead(rejection)
    response.end(rejection === 403 ? 'forbidden' : 'unauthorized')
    return false
  }
  connection.authenticatedUrl = baseUrl => baseUrl
  return () => {
    active = false
    Object.assign(connection, original)
  }
}

/** Override authentication on the pinned upstream service without replacing its browser module. */
export function apply(ctx: Context, config: Config = {}): void {
  const { browserAuth } = config
  if (browserAuth?.enabled !== undefined && typeof browserAuth.enabled !== 'boolean') {
    throw new TypeError('connection.browserAuth.enabled must be a boolean')
  }
  if (browserAuth?.enabled !== false) return
  const connection = ctx.connection
  ctx.effect(() => disableBrowserAuthentication(connection), 'ipaper.connection.browserAuth')
}
