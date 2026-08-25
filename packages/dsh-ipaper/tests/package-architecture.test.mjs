import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const composition = await readFile(new URL('cordis.patch.yml', root), 'utf8')
const copyScript = await readFile(new URL('scripts/copy-web-ui-assets.mjs', root), 'utf8')
const hostRuntime = await readFile(new URL('src/index.ts', root), 'utf8')
const startup = await readFile(new URL('src/startup.ts', root), 'utf8')
const readme = await readFile(new URL('README.md', root), 'utf8')

test('publishes one product bundle with an exact shared runtime dependency', () => {
  assert.equal(manifest.name, '@isomoes/dsh-ipaper')
  assert.equal(manifest.dependencies['@isomoes/dsh-web-ui'], '0.5.1')
  assert.equal(manifest.devDependencies['@isomoes/dsh-web-ui'], undefined)
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.exports['./src/*'], undefined)
  assert.ok(manifest.files.includes('lib/web/**'))
  assert.ok(manifest.files.includes('preset/academic-writing/**'))
})

test('copies the built shell through the dependency public export only', () => {
  assert.match(copyScript, /import\.meta\.resolve\('@isomoes\/dsh-web-ui\/web\/index\.html'\)/)
  assert.doesNotMatch(copyScript, /ikanban|\.\.\/\.\.\/web-ui|\/src\//)
})

test('composition keeps shared clients neutral and branding product-owned', () => {
  const shared = [...composition.matchAll(/name: '(@isomoes\/dsh-web-ui\/client\/[^']+)'/g)].map(match => match[1])
  assert.ok(shared.length >= 30, `expected complete shared roster, found ${shared.length}`)
  assert.equal(new Set(shared).size, shared.length)
  assert.match(composition, /name: '@isomoes\/dsh-web-ui\/client\/ui-conversation'/)
  assert.match(composition, /name: '@isomoes\/dsh-web-ui\/client\/ui-timeline'/)
  assert.match(composition, /name: '@isomoes\/dsh-ipaper\/client\/ui-brand-ipaper'/)
  assert.equal((composition.match(/ui-brand-ipaper/g) ?? []).length, 2)
  assert.doesNotMatch(composition, /dsh-ikanban|ui-brand-ikanban|project-mcp|coding agent/i)
  assert.match(composition, /default: academic-writing/)
})

test('host registry identities remain product-neutral', () => {
  assert.match(hostRuntime, /export const name = 'web-app'/)
  assert.match(hostRuntime, /name: 'app:web-surface'/)
  assert.match(hostRuntime, /name: 'web-runtime'/)
  assert.match(startup, /export const name = 'web-startup'/)
  assert.doesNotMatch(`${hostRuntime}\n${startup}`, /(?:name\s*=|name:)\s*['"](?:app:)?ipaper-web-/i)
})

test('published documentation defines the external extension contract', () => {
  for (const phrase of ['## Extension recipe', 'typert-loader.config.packages', 'shared Web UI slot contract', 'isolated profile']) {
    assert.match(readme, new RegExp(phrase.replaceAll('.', '\\.'), 'i'))
  }
  assert.match(readme, /@isomoes\/dsh-web-ui@0\.5\.1/)
  assert.match(readme, /install and run/i)
  assert.match(readme, /update or remove/i)
})
