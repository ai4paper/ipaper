import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const root = new URL('../', import.meta.url)
const output = new URL('lib/clients/ui-brand-ipaper/', root)
const id = '@ai4paper/dsh-ipaper/client/ui-brand-ipaper'
const statusOutput = new URL('lib/clients/ui-paper-project/', root)
const statusId = '@ai4paper/dsh-ipaper/client/ui-paper-project'

test('emits an isolated IPaper branding package with shared slot injections', async () => {
  const [bundle, manifest, index] = await Promise.all([
    readFile(new URL('client.js', output), 'utf8'),
    readFile(new URL('package.json', output), 'utf8').then(JSON.parse),
    readFile(new URL('index.js', output), 'utf8'),
  ])
  assert.ok(bundle.includes(`id: ${JSON.stringify(id)}`))
  assert.match(bundle, /IPaper/)
  assert.match(bundle, /sidebar\.brand\.mark/)
  assert.equal(manifest.name, id)
  assert.equal(manifest.dsh.client.platform, 'web')
  assert.deepEqual(manifest.dsh.client.inject, [
    '@deepseek-ai/dsh-client-runtime',
    '@isomoes/dsh-web-ui/client/ui-conversation',
    '@isomoes/dsh-web-ui/client/ui-sidebar',
  ])
  assert.match(index, /^export function apply\(\) \{\}\s*$/)
})

test('emits the sidebar toggle and full paper status main view', async () => {
  const [bundle, manifest, index] = await Promise.all([
    readFile(new URL('client.js', statusOutput), 'utf8'),
    readFile(new URL('package.json', statusOutput), 'utf8').then(JSON.parse),
    readFile(new URL('index.js', statusOutput), 'utf8'),
  ])
  assert.ok(bundle.includes(`id: ${JSON.stringify(statusId)}`))
  assert.match(bundle, /Paper status/)
  assert.match(bundle, /paper-project\/status/)
  assert.match(bundle, /sidebar\.footer\.action/)
  assert.match(bundle, /conversation\.view/)
  assert.match(bundle, /Toggle Paper status/)
  assert.match(bundle, /view\.paper-status/)
  assert.match(bundle, /mod\+shift\+p/)
  assert.match(bundle, /data-composer-seat/)
  assert.match(bundle, /sidebar\.workspaces/)
  assert.doesNotMatch(bundle, /Project graph/)
  assert.match(bundle, /Project lenses/)
  assert.match(bundle, /Find a question/)
  assert.match(bundle, /Questions × people × methods/)
  assert.match(bundle, /People care/)
  assert.match(bundle, /Start guided workflow/)
  assert.match(bundle, /\/find-the-problem/)
  assert.match(bundle, /\.session\.prompt/)
  assert.doesNotMatch(bundle, /\.session\.command/)
  assert.equal(manifest.name, statusId)
  assert.equal(manifest.dsh.client.platform, 'web')
  assert.deepEqual(manifest.dsh.client.inject, [
    '@deepseek-ai/dsh-client-connection',
    '@deepseek-ai/dsh-client-runtime',
    '@isomoes/dsh-web-ui/client/ui-commands',
    '@isomoes/dsh-web-ui/client/ui-conversation',
    '@isomoes/dsh-web-ui/client/ui-sidebar',
  ])
  assert.match(index, /^export function apply\(\) \{\}\s*$/)
})

test('resolves product and every composed shared client from the workspace anchor', async () => {
  const resolve = createRequire(new URL('package.json', root)).resolve
  assert.equal(resolve(id), new URL('lib/clients/ui-brand-ipaper/index.js', root).pathname)
  assert.equal(resolve(statusId), new URL('lib/clients/ui-paper-project/index.js', root).pathname)
  const composition = await readFile(new URL('cordis.patch.yml', root), 'utf8')
  const sharedIds = [...composition.matchAll(/name: '@isomoes\/dsh-web-ui\/client\/([^']+)'/g)].map(match => match[1])
  assert.ok(sharedIds.length >= 30)
  for (const shared of sharedIds) {
    assert.match(resolve(`@isomoes/dsh-web-ui/client/${shared}`), new RegExp(`/dsh-web-ui/.+/${shared}/index\\.js$|/dsh-web-ui/lib/clients/${shared}/index\\.js$`))
    assert.match(resolve(`@isomoes/dsh-web-ui/client/${shared}/client`), /client\.js$/)
    assert.match(resolve(`@isomoes/dsh-web-ui/client/${shared}/package.json`), /package\.json$/)
  }
})
