import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const composition = await readFile(new URL('cordis.patch.yml', root), 'utf8')
const agentComposition = await readFile(new URL('preset/ipaper/agent.cordis.yml', root), 'utf8')
const copyScript = await readFile(new URL('scripts/copy-web-ui-assets.mjs', root), 'utf8')
const hostRuntime = await readFile(new URL('src/index.ts', root), 'utf8')
const startup = await readFile(new URL('src/startup.ts', root), 'utf8')
const readme = await readFile(new URL('README.md', root), 'utf8')
const brand = await readFile(new URL('client/ui-brand-ipaper/client/Brand.tsx', root), 'utf8')

test('publishes one product bundle with an exact shared runtime dependency', () => {
  assert.equal(manifest.name, '@ai4paper/dsh-ipaper')
  assert.equal(manifest.version, '0.1.2')
  assert.equal(manifest.dependencies['@isomoes/dsh-web-ui'], '0.5.1')
  assert.equal(manifest.devDependencies['@isomoes/dsh-web-ui'], undefined)
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.exports['./src/*'], undefined)
  assert.ok(manifest.files.includes('lib/web/**'))
  assert.ok(manifest.files.includes('preset/ipaper/**'))
})

test('shows IPaper and the product package version in product-owned branding', () => {
  assert.match(brand, /import manifest from '\.\.\/\.\.\/\.\.\/package\.json' with \{ type: 'json' \}/)
  assert.match(brand, /IPAPER_VERSION = manifest\.version/)
  assert.match(brand, /closest\('\[data-slot="conversation\.hero\.brand\.mark"\]'\)/)
  assert.match(brand, /headline\.textContent = 'IPaper'/)
  assert.match(brand, /closest\('\[data-slot="sidebar\.brand\.name"\]'\)/)
  assert.equal((brand.match(/versionBadge\.textContent = `v\$\{IPAPER_VERSION\}`/g) ?? []).length, 2)
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
  assert.match(composition, /name: '@ai4paper\/dsh-ipaper\/client\/ui-brand-ipaper'/)
  assert.equal((composition.match(/ui-brand-ipaper/g) ?? []).length, 2)
  assert.doesNotMatch(composition, /dsh-ikanban|ui-brand-ikanban|project-mcp|coding agent/i)
  assert.match(composition, /default: ipaper/)
  assert.match(composition, /includeUserRoot: true/)
})

test('mounts and publishes the singleton paper project storage service', () => {
  assert.deepEqual(manifest.exports['./paper-project'], {
    types: './lib/types/paper-project/index.d.ts',
    default: './lib/paper-project/index.js',
  })
  const storageDomainAt = composition.indexOf("- id: storage-domain")
  const paperProjectAt = composition.indexOf("- id: paper-project")
  const workspaceAt = composition.indexOf("- id: workspace")
  assert.ok(storageDomainAt >= 0 && storageDomainAt < workspaceAt)
  assert.ok(workspaceAt < paperProjectAt)
  assert.match(composition, /name: '@ai4paper\/dsh-ipaper\/paper-project'/)
  assert.match(composition, /inject: \[storageDomain, workspaceRegistry, agents\]/)
  assert.deepEqual(manifest.exports['./paper-project-tools'], {
    types: './lib/types/paper-project/tools.d.ts',
    default: './lib/paper-project/tools.js',
  })
  assert.deepEqual(manifest.exports['./product-protocol'], {
    types: './lib/types/product-protocol.d.ts',
    default: './lib/product-protocol.js',
  })
  assert.match(agentComposition, /- id: paper-project-tools\s+name: '@ai4paper\/dsh-ipaper\/paper-project-tools'/)
  assert.match(agentComposition, /- id: product-protocol\s+name: '@ai4paper\/dsh-ipaper\/product-protocol'/)
  assert.doesNotMatch(composition, /name: '@ai4paper\/dsh-ipaper\/product-protocol'/)
})

test('host registry identities remain product-neutral', () => {
  assert.match(hostRuntime, /export const name = 'web-app'/)
  assert.match(hostRuntime, /name: 'web-runtime'/)
  assert.match(startup, /export const name = 'web-startup'/)
  assert.doesNotMatch(`${hostRuntime}\n${startup}`, /(?:name\s*=|name:)\s*['"](?:app:)?ipaper-web-/i)
})

test('published documentation defines the external extension contract', () => {
  for (const phrase of ['## Extension recipe', 'typert-loader.config.packages', 'shared Web UI slot contract', 'isolated profile']) {
    assert.match(readme, new RegExp(phrase.replaceAll('.', '\\.'), 'i'))
  }
  assert.match(readme, /@isomoes\/dsh-web-ui@0\.5\.1/)
  assert.match(readme, /@ai4paper\/apaper-plugin@0\.2\.3/)
  assert.match(readme, /install and run/i)
  assert.match(readme, /update or remove/i)
})
