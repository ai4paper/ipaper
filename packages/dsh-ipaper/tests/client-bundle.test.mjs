import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

const root = new URL('../', import.meta.url)
const id = '@ai4paper/dsh-ipaper'

async function loadClient(colorblindMetadata) {
  let plugin
  const require = createRequire(new URL('package.json', root))
  const source = await readFile(new URL('lib/client.js', root), 'utf8')
  const document = { head: { querySelector: selector => {
    assert.equal(selector, 'meta[name="ipaper-colorblind"]')
    return colorblindMetadata === undefined ? null : { getAttribute: () => colorblindMetadata }
  } } }
  runInNewContext(source, { document, window: { __ModuleLoader__: { load: ({ id: moduleId, factory }) => {
    assert.equal(moduleId, id)
    plugin = factory(require)
  } } } })
  return plugin
}

function context(availableSlots) {
  const registrations = []
  const connection = { rpc: {} }
  const ctx = {
    get: name => name === 'connection' ? connection : undefined,
    effect: () => {},
    sessions: { list: {} },
    workspaces: { list: {} },
    layout: { selectPanel: () => {} },
    slots: {
      inject: (name, install) => {
        if (availableSlots !== undefined && !availableSlots.has(name)) return
        const result = install()
        if (result?.[Symbol.iterator]) Array.from(result)
      },
      register: options => { registrations.push(options) },
    },
  }
  return { ctx, registrations, connection }
}

test('ships one discoverable package-root browser half', async () => {
  const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
  const resolve = createRequire(new URL('package.json', root)).resolve
  assert.equal(resolve(`${id}/client`), new URL('lib/client.js', root).pathname)
  assert.equal(manifest.dsh.client.platform, 'web')
  for (const dependency of ['@deepseek-ai/dsh-client-ui-theme', '@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-client-ui-conversation']) {
    assert.ok(manifest.dsh.client.inject.includes(dependency), dependency)
  }
  assert.ok(!Object.keys(manifest.exports).some(key => key.startsWith('./client/')))
  assert.ok(!(await readdir(new URL('lib/', root))).includes('clients'))
  const composition = await readFile(new URL('cordis.patch.yml', root), 'utf8')
  assert.doesNotMatch(composition, /@isomoes\/dsh-web-ui|@ai4paper\/dsh-ipaper\/client\//)
})

test('host boolean metadata enables colorblind accents without browser entry config', async () => {
  for (const value of [undefined, 'false', 'true', 'TRUE']) {
    const plugin = await loadClient(value)
    const { ctx } = context()
    let tokens
    ctx.effect = (install, name) => { if (name === 'ipaper.colorblind') install() }
    ctx.theme = { overrideTokens: (_id, layer) => { tokens = layer; return () => {} } }
    plugin.apply(ctx)
    assert.equal(tokens !== undefined, value === 'true')
    if (tokens !== undefined) {
      assert.equal(tokens['--dsw-alias-state-success-primary'].light, '#0072B2')
      assert.equal(tokens['--dsw-alias-state-success-primary'].dark, '#56B4E9')
    }
  }
})

test('root browser activation contributes branding and the native Paper status view', async () => {
  const plugin = await loadClient()
  const { ctx, registrations } = context()
  plugin.apply(ctx)
  for (const name of ['sidebar.brand.mark', 'sidebar.brand.name', 'conversation.hero.brand.mark', 'conversation.view']) {
    assert.ok(registrations.some(entry => entry.name === name), name)
  }
  assert.equal(registrations.find(entry => entry.name === 'conversation.view').label, 'Paper status')
})

test('installed upstream bundles own every product contribution seat', async () => {
  const resolve = createRequire(new URL('package.json', root)).resolve
  for (const [owner, seats] of [
    ['@deepseek-ai/dsh-client-ui-sidebar', ['sidebar.brand.mark', 'sidebar.brand.name', 'sidebar.panellist']],
    ['@deepseek-ai/dsh-client-ui-conversation', ['conversation.hero.brand.mark', 'conversation.view']],
    ['@deepseek-ai/dsh-client-ui-layout', ['main']],
  ]) {
    const source = await readFile(resolve(`${owner}/client`), 'utf8')
    for (const seat of seats) assert.ok(source.includes(seat), `${owner} must own ${seat}`)
  }
})

test('Paper status has an independent sidebar panel and starts an unsent session workflow', async () => {
  const plugin = await loadClient()
  const { ctx, registrations } = context(new Set(['main', 'sidebar.panellist']))
  const calls = []
  const panels = []
  ctx.sessions.binding = sessionId => ({ session: { prompt: async (...args) => {
    calls.push({ sessionId, args })
    return { ok: true, value: { accepted: true } }
  } } })
  ctx.layout.selectPanel = panel => { panels.push(panel) }
  plugin.apply(ctx)
  const launcher = registrations.find(entry => entry.name === 'sidebar.panellist')
  const panel = registrations.find(entry => entry.name === 'main')
  assert.equal(launcher.label, 'Paper status')
  assert.equal(launcher.id, panel.key)
  await panel.inject().startFindProblem('unsent-session')
  assert.equal(calls[0].sessionId, 'unsent-session')
  assert.equal(calls[0].args[0][0].text, '/find-the-problem')
  assert.deepEqual(panels, [null])
})

test('sidebar branding activates while the conversation hero owner is absent', async () => {
  const plugin = await loadClient()
  const { ctx, registrations } = context(new Set(['sidebar.brand.mark', 'sidebar.brand.name']))
  plugin.apply(ctx)
  assert.deepEqual(registrations.map(entry => entry.name), ['sidebar.brand.mark', 'sidebar.brand.name'])
})

test('Paper status binds workflow submissions to its injected session scope', async () => {
  const plugin = await loadClient()
  const calls = []
  const { ctx, registrations, connection } = context()
  ctx.sessions.binding = sessionId => ({ session: { prompt: async (...args) => {
    calls.push({ sessionId, args })
    return { ok: true, value: { accepted: true } }
  } } })
  plugin.apply(ctx)
  const registration = registrations.find(entry => entry.name === 'conversation.view')
  const first = registration.inject('session-a')
  const second = registration.inject('session-b')
  await first.startFindProblem()
  await second.startFindProblem()
  assert.deepEqual(calls.map(call => call.sessionId), ['session-a', 'session-b'])
  assert.equal(calls[0].args[0][0].text, '/find-the-problem')
  assert.equal(calls[0].args[1], 'queue')
  assert.equal(first.rpc, connection.rpc)
})

test('a rejected workflow receipt preserves Paper status and reports its error', async () => {
  const plugin = await loadClient()
  const { ctx, registrations } = context()
  ctx.sessions.binding = () => ({ session: { prompt: async () => ({ ok: false, error: { message: 'Session is read-only' } }) } })
  ctx.layout.selectPanel = () => assert.fail('a failed submission must not leave Paper status')
  plugin.apply(ctx)
  const panel = registrations.find(entry => entry.name === 'main')
  await assert.rejects(panel.inject().startFindProblem('read-only-session'), /Session is read-only/)
})

test('colorblind accents are opt-in dual-mode layers with lifecycle disposal', async () => {
  const plugin = await loadClient()
  let applied = 0
  let disposed = 0
  const cleanups = []
  const { ctx } = context()
  ctx.effect = (install, name) => {
    if (name === 'ipaper.colorblind') cleanups.push(install())
  }
  ctx.theme = { overrideTokens: (_id, tokens) => {
    applied++
    for (const modes of Object.values(tokens)) {
      assert.match(modes.light, /^#[\da-f]{6}$/i)
      assert.match(modes.dark, /^#[\da-f]{6}$/i)
    }
    return () => { disposed++ }
  } }
  plugin.apply(ctx)
  assert.equal(applied, 0)
  plugin.apply(ctx, { colorblind: true })
  assert.equal(applied, 1)
  cleanups.forEach(dispose => dispose())
  assert.equal(disposed, 1)
})
