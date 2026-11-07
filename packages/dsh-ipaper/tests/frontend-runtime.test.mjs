import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import * as brand from '../lib/index.js'

const root = new URL('../', import.meta.url)
const require = createRequire(import.meta.url)
const webRequire = createRequire(require.resolve('@deepseek-ai/dsh-web-app/package.json'))
const { Context } = await import(pathToFileURL(webRequire.resolve('@deepseek-ai/cordis')).href)
const { default: WebServer } = await import(pathToFileURL(webRequire.resolve('@deepseek-ai/dsh-host-webserver')).href)

test('branding transforms shell metadata without changing boot payload or scripts', () => {
  const shell = '<html><head><title>DeepSeek</title><link rel="icon" href="/upstream.svg"><link rel="manifest" href="/old.json"><script>window.__DSH_BOOT__={plugins:[]}</script></head><body><div id="root"></div><script src="/assets/shell.js"></script></body></html>'
  const html = brand.brandIndex(shell)
  assert.equal((html.match(/<title>/g) ?? []).length, 1)
  assert.match(html, /<title>IPaper<\/title>/)
  assert.doesNotMatch(html, /upstream.svg|old.json/)
  assert.match(html, /window.__DSH_BOOT__=\{plugins:\[\]\}/)
  assert.match(html, /src="\/assets\/shell.js"/)
  assert.equal(brand.brandIndex(html), html)
})

test('product metadata resolves from a relocated artifact without a workspace link', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'ipaper-brand-artifact-'))
  try {
    await mkdir(join(temp, 'web'))
    await cp(new URL('lib/index.js', root), join(temp, 'index.mjs'))
    await cp(new URL('lib/web/', root), join(temp, 'web'), { recursive: true })
    const product = await import(pathToFileURL(join(temp, 'index.mjs')).href)
    for (const asset of product.PRODUCT_ASSETS) {
      assert.equal(product.productAssetPath(asset.file), join(temp, 'web', asset.file))
      assert.ok((await readFile(product.productAssetPath(asset.file))).length > 0)
    }
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('colorblind metadata is boolean, replaceable, and idempotent', () => {
  const shell = '<head><meta name="other" content="keep"><meta name="ipaper-colorblind" content="false"></head>'
  const enabled = brand.brandIndex(shell, { colorblind: true })
  assert.equal((enabled.match(/name="ipaper-colorblind"/g) ?? []).length, 1)
  assert.match(enabled, /name="ipaper-colorblind" content="true"/)
  assert.match(enabled, /name="other" content="keep"/)
  assert.equal(brand.brandIndex(enabled, { colorblind: true }), enabled)
  assert.match(brand.brandIndex(enabled), /name="ipaper-colorblind" content="false"/)
})

test('upstream webserver serves product assets, HEAD, and preserves its fallback', async t => {
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(WebServer, { host: '127.0.0.1', port: 0 }).await()
  ctx.webServer.registerFallback({ resource: async () => new Response('upstream shell') })
  const fiber = ctx.plugin(brand, { colorblind: true })
  await fiber.await()
  const origin = ctx.webServer.getOrigin()
  for (const asset of brand.PRODUCT_ASSETS) {
    const response = await fetch(`${origin}/${asset.file}`)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), asset.type)
    assert.equal(await response.text(), await readFile(brand.productAssetPath(asset.file), 'utf8'))
    const head = await fetch(`${origin}/${asset.file}`, { method: 'HEAD' })
    assert.equal(head.status, 200)
    assert.equal(await head.text(), '')
    assert.equal((await fetch(`${origin}/${asset.file}`, { method: 'POST' })).status, 405)
  }
  assert.equal(await (await fetch(`${origin}/`)).text(), 'upstream shell')
  assert.match(ctx.webServer.applyIndexTaps('<head></head>'), /<title>IPaper/)
  assert.match(ctx.webServer.applyIndexTaps('<head></head>'), /name="ipaper-colorblind" content="true"/)
  await fiber.dispose()
  assert.equal(await (await fetch(`${origin}/favicon.svg`)).text(), 'upstream shell')
  assert.equal(ctx.webServer.applyIndexTaps('<head></head>'), '<head></head>')
})
