import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import * as upstream from '@deepseek-ai/dsh-client-connection'
import * as connection from '../lib/connection.js'

async function start(t, config) {
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  ctx.provide('credentials', { async modifyRecord(_key, modify) { return modify(undefined) } })
  await ctx.plugin(WebServer, { host: '127.0.0.1', port: 0 }).await()
  await ctx.plugin({ ...upstream, inject: [...upstream.inject, 'webServer'] }).await()
  const policy = ctx.plugin(connection, config)
  await policy.await()
  ctx.webServer.register({ kind: 'exact', path: '/', handler(request, response) {
    if (ctx.connection.authorizeIndex(request, response)) response.end('ready')
  } })
  ctx.connection.rpc.handle('/test-rpc', async () => ({ ok: true, value: 'rpc-ready' }))
  return { ctx, policy, origin: ctx.webServer.getOrigin() }
}

test('authentication defaults on and token exchange admits page and RPC', async t => {
  const { ctx, origin } = await start(t)
  assert.equal((await fetch(origin)).status, 401)
  assert.equal((await fetch(`${origin}/api/check`, { method: 'POST' })).status, 401)
  const url = ctx.connection.authenticatedUrl(origin)
  assert.ok(new URL(url).searchParams.get('token'))
  const login = await fetch(url, { redirect: 'manual' })
  assert.equal(login.status, 303)
  const cookie = login.headers.get('set-cookie').split(';')[0]
  assert.equal((await fetch(origin, { headers: { cookie } })).status, 200)
})

test('disabled authentication admits clean page, RPC and connection while retaining origin checks', async t => {
  const { ctx, policy, origin } = await start(t, { browserAuth: { enabled: false } })
  assert.equal(ctx.connection.authenticatedUrl(origin), origin)
  const page = await fetch(origin)
  assert.equal(page.status, 200)
  assert.equal(page.headers.get('set-cookie'), null)
  const response = await fetch(`${origin}/test-rpc/check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'test', method: 'check', payload: {} }),
  })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).result.value, 'rpc-ready')
  const headers = { host: new URL(origin).host, origin }
  const admission = ctx.connection.admitConnection({ headers })
  assert.ok('peer' in admission)
  await admission.release()
  assert.equal(ctx.connection.requestRejection({ headers: { ...headers, origin: 'http://untrusted.invalid' } }), 403)
  assert.equal((await fetch(origin, { headers: { origin: 'http://untrusted.invalid' } })).status, 403)
  await policy.dispose()
  assert.equal((await fetch(origin)).status, 401)
  assert.equal((await fetch(`${origin}/api/check`, { method: 'POST' })).status, 401)
  assert.ok(new URL(ctx.connection.authenticatedUrl(origin)).searchParams.get('token'))
})
