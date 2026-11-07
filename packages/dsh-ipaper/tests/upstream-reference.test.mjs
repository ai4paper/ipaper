import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const webManifest = require.resolve('@deepseek-ai/dsh-web-app/package.json')
const upstreamRequire = createRequire(webManifest)
const supportedVersion = '0.2.2-rc.1'
assert.equal(JSON.parse(readFileSync(webManifest, 'utf8')).version, supportedVersion)

// Execute installed published bundles without rewriting their implementation.
// Only external dependencies and host/session services are stubbed. These checks
// establish controller behavior, not browser rendering or server cancellation.
function loadClient(name) {
  const manifest = JSON.parse(readFileSync(upstreamRequire.resolve(`${name}/package.json`), 'utf8'))
  assert.equal(manifest.version, supportedVersion, 'reassess version-specific upstream compatibility checks on upgrade')
  let exports
  const errors = []
  const dependencies = {
    '@deepseek-ai/cordis': { Service: class { constructor(ctx) { this.ctx = ctx } } },
    '@deepseek-ai/dsh-client-store': {
      createSnapshotStore(value) {
        return { getSnapshot: () => value, set: next => { value = next }, subscribe: () => () => {} }
      },
    },
    '@deepseek-ai/dsh-client-ui-primitives': { relativeTime: () => ({ unit: 'now', n: 0 }) },
    'react': {},
    'react/jsx-runtime': {},
  }
  const filename = upstreamRequire.resolve(`${name}/client`)
  vm.runInNewContext(readFileSync(filename, 'utf8'), {
    AbortController,
    console: { error: (...args) => errors.push(args) },
    window: {
      __ModuleLoader__: {
        load: ({ factory }) => {
          exports = factory(dependency => {
            assert.ok(dependency in dependencies, `unexpected import ${dependency}`)
            return dependencies[dependency]
          })
        },
      },
    },
  }, { filename })
  return { exports, errors }
}

const flush = () => new Promise(resolve => setImmediate(resolve))
function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function setup() {
  const { exports: reference } = loadClient('@deepseek-ai/dsh-client-ui-reference')
  const { exports: triggers, errors } = loadClient('@deepseek-ai/dsh-client-ui-input-trigger')
  let source
  const calls = []
  const sessions = {
    binding: () => ({}),
    using: async (_id, _options, fn) => fn({ binding: { session: { getSnapshot: () => ({ openState: 'open' }) } } }),
    list: { getSnapshot: () => ({ byId: {} }) },
  }
  const lookup = kind => (sessionId, query, signal) => {
    const result = deferred()
    calls.push({ kind, sessionId, query, signal, ...result })
    // Ignore abort intentionally: late completion must remain harmless.
    return result.promise
  }
  reference.apply({
    effect: fn => fn(),
    locale: { register() {}, bind: () => key => key },
    get: name => name === 'sessions' ? sessions : { registerSource: registered => { source = registered } },
    uiConversation: { userText: { register() {} } },
    slots: { inject() {} },
    remote: {
      fileReferences: { list: lookup('file') },
      sessionReferenceResolver: { candidates: lookup('session') },
      $host: {},
    },
  })
  const controller = new triggers.InputTriggerController({
    sessionId: 'current', actx: {}, roster: { all: () => [source], sources: () => [source] },
  })
  return { controller, calls, errors }
}

const files = path => ({ ok: true, value: [{ path, kind: 'file' }] })
const empty = { ok: true, value: [] }
const track = (controller, text, revision = 1) => controller.track(text, text.length, { tier: 'plain' }, revision)

test('upstream 0.2.2-rc.1 reference latency characterization and combined file/session results', async () => {
  const { controller, calls } = setup()
  track(controller, '@paper')
  assert.deepEqual(calls.map(({ kind, sessionId, query }) => ({ kind, sessionId, query })), [
    { kind: 'file', sessionId: 'current', query: 'paper' },
    { kind: 'session', sessionId: 'current', query: 'paper' },
  ])
  calls[0].resolve(files('paper.md'))
  await flush()
  // Accepted version-specific limitation, not desired future product behavior:
  // the combined source waits for sessions even when files have resolved.
  assert.equal(controller.menu.getSnapshot().groups[0].status, 'pending')
  assert.equal(controller.menu.getSnapshot().groups[0].items.length, 0)
  calls[1].resolve({ ok: true, value: [{
    sessionId: 'other', label: 'Paper discussion', mention: '@session:other',
    sameWorkspace: true, createdAt: Date.now(),
  }] })
  await flush()
  const items = controller.menu.getSnapshot().groups[0].items
  assert.equal(items.length, 2)
  assert.equal(items[0].name, 'paper.md')
  assert.equal(items[1].name, 'Paper discussion')
  assert.equal(JSON.parse(items[0].value).kind, 'file')
  assert.equal(JSON.parse(items[1].value).mention, '@session:other')
})

test('quoted reference skips session lookup and preserves quoted file mention', async () => {
  const { controller, calls } = setup()
  track(controller, '@"paper')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].kind, 'file')
  calls[0].resolve(files('paper draft.md'))
  await flush()
  const item = controller.menu.getSnapshot().groups[0].items[0]
  assert.equal(item.name, 'paper draft.md')
  assert.equal(JSON.parse(item.value).mention, '@"paper draft.md"')
})

test('supersession aborts both old lookups and ignores late successful settlements', async () => {
  const { controller, calls } = setup()
  track(controller, '@old')
  track(controller, '@new', 2)
  assert.equal(calls[0].signal, calls[1].signal)
  assert.equal(calls[0].signal.aborted, true)
  assert.equal(calls[2].signal.aborted, false)
  calls[2].resolve(files('new.md'))
  calls[3].resolve(empty)
  await flush()
  calls[0].resolve(files('old.md'))
  calls[1].resolve(empty)
  await flush()
  assert.equal(controller.menu.getSnapshot().groups[0].items[0].name, 'new.md')
})

for (const action of ['dismiss', 'dispose', 'remove-token']) {
  test(`${action} aborts reference lookups and late settlements do not reopen menu`, async () => {
    const { controller, calls } = setup()
    track(controller, '@paper')
    if (action === 'remove-token') track(controller, '', 2)
    else controller[action]()
    assert.equal(calls[0].signal.aborted, true)
    assert.equal(calls[1].signal.aborted, true)
    calls[0].resolve(files('late.md'))
    calls[1].resolve(empty)
    await flush()
    assert.equal(controller.menu.getSnapshot().open, false)
  })
}

test('upstream 0.2.2-rc.1 combined-source rejection is contained and logged', async () => {
  const { controller, calls, errors } = setup()
  track(controller, '@paper')
  calls[0].resolve(files('paper.md'))
  calls[1].reject(new Error('injected session failure'))
  await flush()
  assert.equal(controller.menu.getSnapshot().open, false)
  assert.equal(errors.length, 1)
  assert.match(errors[0][0], /source "reference" candidates failed/)
  assert.equal(errors[0][1].message, 'injected session failure')
})

test('public registry accepts independent @ sources with independent settlement and owned disposal', async () => {
  const { exports: { InputTriggerController, InputTriggerService } } = loadClient('@deepseek-ai/dsh-client-ui-input-trigger')
  const service = new InputTriggerService({ on() {} })
  const slow = deferred()
  const fast = { trigger: '@', name: 'files', candidates: async () => [{ name: 'paper.md' }], onPick() {} }
  const sessions = { trigger: '@', name: 'sessions', candidates: () => slow.promise, onPick() {} }
  const unregister = service.registerSource(fast)
  service.registerSource(sessions)
  assert.throws(() => service.registerSource(fast), /already registered/)
  unregister()
  assert.doesNotThrow(() => service.registerSource(fast))
  assert.throws(() => service.registerSource(sessions), /already registered/)
  // sessionOf needs retained Cordis scopes; exercise the exported controller
  // with the same roster rather than claiming full service/scope integration.
  const controller = new InputTriggerController({
    sessionId: 'current', actx: {}, roster: { all: () => [fast, sessions], sources: () => [fast, sessions] },
  })
  track(controller, '@paper')
  await flush()
  assert.equal(controller.menu.getSnapshot().groups[0].status, 'ready')
  assert.equal(controller.menu.getSnapshot().groups[0].items[0].name, 'paper.md')
  assert.equal(controller.menu.getSnapshot().groups[1].status, 'pending')
  slow.resolve([])
  await flush()
  assert.equal(controller.menu.getSnapshot().open, true)
})
