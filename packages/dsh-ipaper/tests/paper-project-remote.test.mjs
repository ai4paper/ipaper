import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import * as remote from '../lib/paper-project-remote.js'
import {
  createPaperProjectRpcHandler,
  IPAPER_STATUS_ENDPOINT,
  paperProjectStatus,
} from '../lib/paper-project-remote.js'

const snapshot = {
  project: { projectId: 'paper-workspace-a', workspaceId: 'workspace-a', revision: 2 },
  records: [],
  history: [],
  legacySnapshot: { private: 'legacy data must not be sent to browsers' },
}

const source = {
  async statusSnapshot(workspaceId) {
    return workspaceId === 'workspace-a' ? snapshot : undefined
  },
}

const signal = new AbortController().signal
const owner = { principal: { kind: 'owner' } }

test('projects one workspace snapshot into a dashboard status payload', async () => {
  const status = await paperProjectStatus(source, 'workspace-a')
  assert.equal(status.snapshot, undefined)
  assert.equal(status.summary.workspaceId, 'workspace-a')
  assert.equal(status.summary.revision, 2)
  assert.deepEqual(status.summary.counts, { source: 0, finding: 0, note: 0 })
  assert.equal(status.legacySnapshot, undefined)
  assert.equal(await paperProjectStatus(source, 'missing'), null)
})

test('serves only the typed paper-project status endpoint', async () => {
  const handler = createPaperProjectRpcHandler(source)
  const result = await handler(IPAPER_STATUS_ENDPOINT, { workspaceId: 'workspace-a' }, signal, owner)
  assert.equal(result.ok, true)
  assert.equal(result.value.summary.projectId, 'paper-workspace-a')

  const missingId = await handler(IPAPER_STATUS_ENDPOINT, {}, signal, owner)
  assert.equal(missingId.ok, false)
  assert.equal(missingId.error.code, 'bad-request')

  const unknown = await handler('other', { workspaceId: 'workspace-a' }, signal, owner)
  assert.equal(unknown.ok, false)
})

test('denies authenticated non-owner peers before reading workspace graphs', async () => {
  const handler = createPaperProjectRpcHandler({ async statusSnapshot() { assert.fail('must not read memory') } })
  const result = await handler(IPAPER_STATUS_ENDPOINT, { workspaceId: 'workspace-a' }, signal, { principal: { kind: 'session', sessionId: 'session-a' } })
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'forbidden')
})

test('mounts the RPC through real Connection and WebServer with explicit service injection', async t => {
  const require = createRequire(import.meta.url)
  const webRequire = createRequire(require.resolve('@deepseek-ai/dsh-web-app/package.json'))
  const { Context } = await import(pathToFileURL(webRequire.resolve('@deepseek-ai/cordis')).href)
  const { default: WebServer } = await import(pathToFileURL(webRequire.resolve('@deepseek-ai/dsh-host-webserver')).href)
  const connection = await import(pathToFileURL(webRequire.resolve('@deepseek-ai/dsh-client-connection')).href)
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  ctx.provide('credentials', { async modifyRecord(_key, modify) { return modify(undefined) } })
  ctx.provide('paperProjects', source)
  await ctx.plugin(WebServer, { host: '127.0.0.1', port: 0 }).await()
  await ctx.plugin({ ...connection, inject: [...connection.inject, 'webServer'] }).await()
  ctx.webServer.register({ kind: 'exact', path: '/', handler(request, response) {
    if (ctx.connection.authorizeIndex(request, response)) response.end('authenticated')
  } })
  const fiber = ctx.plugin(remote)
  await fiber.await()
  const origin = ctx.webServer.getOrigin()
  const endpoint = `${origin}${remote.IPAPER_RPC_CHANNEL}/${IPAPER_STATUS_ENDPOINT}`
  assert.equal((await fetch(endpoint, { method: 'POST' })).status, 401)
  const login = await fetch(ctx.connection.authenticatedUrl(origin), { redirect: 'manual' })
  const cookie = login.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'paper-test', method: IPAPER_STATUS_ENDPOINT, payload: { workspaceId: 'workspace-a' } }),
  })
  assert.equal(response.status, 200)
  const envelope = await response.json()
  assert.equal(envelope.result.ok, true)
  assert.equal(envelope.result.value.summary.projectId, 'paper-workspace-a')
  await fiber.dispose()
  assert.equal((await fetch(endpoint, { method: 'POST', headers: { cookie } })).status, 404)
})
