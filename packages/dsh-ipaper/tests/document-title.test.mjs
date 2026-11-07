import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = await readFile(new URL('../client/title.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function harness() {
  const document = { title: 'IPaper' }
  const effects = []
  const microtasks = []
  const exports = {}
  vm.runInNewContext(compiled, {
    exports, document,
    queueMicrotask: (callback) => microtasks.push(callback),
    require: (id) => {
      assert.equal(id, 'react')
      return { useEffect: (effect, deps) => effects.push({ effect, deps }) }
    },
  })
  return {
    document, exports,
    render(byId = {}, activePanelId = null) {
      exports.IPaperDocumentTitle({
        useSessions: (selector) => selector({ byId }),
        usePanelInfo: (selector) => selector({ activePanelId }),
      })
      return effects.pop()
    },
    flush() { while (microtasks.length) microtasks.shift()() },
  }
}

test('product title follows retained main session and panel navigation after upstream effects', () => {
  const h = harness()
  let cleanup = () => {}
  const states = [
    [{}, null, 'IPaper'],
    [{ a: { title: 'Paper A', retainedBy: { mainView: 1 } } }, null, 'Paper A — IPaper'],
    [{ a: { title: 'Renamed', retainedBy: { mainView: 1 } } }, null, 'Renamed — IPaper'],
    [{ a: { title: 'Renamed', retainedBy: { mainView: 1 } } }, 'settings', 'IPaper'],
    [{ a: { title: 'Renamed', retainedBy: { mainView: 1 } } }, null, 'Renamed — IPaper'],
    [{ a: { title: 'Old', retainedBy: {} }, b: { title: 'Paper B', retainedBy: { mainView: 1 } } }, null, 'Paper B — IPaper'],
    [{ a: { retainedBy: { mainView: 1 } } }, null, 'IPaper'],
  ]
  for (const [byId, panel, expected] of states) {
    cleanup()
    cleanup = h.render(byId, panel).effect()
    h.document.title = 'Upstream title — DeepSeek Harness'
    h.flush()
    assert.equal(h.document.title, expected)
  }
})

test('disposed effects cannot write after navigation, strict-effect replay, or removal', () => {
  const h = harness()
  const first = h.render({ a: { title: 'Stale', retainedBy: { mainView: 1 } } }).effect()
  first()
  const second = h.render().effect()
  h.flush()
  assert.equal(h.document.title, 'IPaper')
  second()
  const removed = h.render().effect()
  removed()
  h.document.title = 'Different product'
  h.flush()
  assert.equal(h.document.title, 'Different product')
})

test('title uses an additive declaration-aware shell occupant', () => {
  const h = harness()
  let registered
  h.exports.apply({ slots: {
    inject(name, callback) { assert.equal(name, 'shell.overlay'); return callback() },
    register(options, component) { registered = { options, component } },
  } })
  assert.equal(registered.options.name, 'shell.overlay')
  assert.equal(registered.options.id, 'ipaper.document-title')
  assert.equal(registered.component, h.exports.IPaperDocumentTitle)
})

test('pinned upstream title still uses the public mirrors and passive-effect contract', async () => {
  const webRequire = createRequire(require.resolve('@deepseek-ai/dsh-web-app/package.json'))
  const layoutPath = webRequire.resolve('@deepseek-ai/dsh-client-ui-layout/client')
  const layout = await readFile(layoutPath, 'utf8')
  const start = layout.indexOf('function DocumentTitle(')
  const end = layout.indexOf('return null;', start)
  assert.ok(start >= 0 && end > start, 'Recheck the upstream title lifecycle before upgrading DSH')
  const title = layout.slice(start, end)
  assert.match(title, /usePanelInfo/)
  assert.match(title, /activePanelId === null/)
  assert.match(title, /useSessions/)
  assert.match(title, /retainedBy\.mainView/)
  assert.match(title, /react\.useEffect/)
  assert.match(title, /\[productTitle, title\]/)
  assert.match(layout, /renderSlot\("shell\.overlay", \{\}\)/)
})
