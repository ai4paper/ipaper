import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const root = new URL('../', import.meta.url)
const output = new URL('lib/clients/ui-brand-ipaper/', root)
const id = '@ai4paper/dsh-ipaper/client/ui-brand-ipaper'

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

test('resolves product and every composed shared client from the workspace anchor', async () => {
  const resolve = createRequire(new URL('package.json', root)).resolve
  assert.equal(resolve(id), new URL('lib/clients/ui-brand-ipaper/index.js', root).pathname)
  const composition = await readFile(new URL('cordis.patch.yml', root), 'utf8')
  const sharedIds = [...composition.matchAll(/name: '@isomoes\/dsh-web-ui\/client\/([^']+)'/g)].map(match => match[1])
  assert.ok(sharedIds.length >= 30)
  for (const shared of sharedIds) {
    assert.match(resolve(`@isomoes/dsh-web-ui/client/${shared}`), new RegExp(`/dsh-web-ui/.+/${shared}/index\\.js$|/dsh-web-ui/lib/clients/${shared}/index\\.js$`))
    assert.match(resolve(`@isomoes/dsh-web-ui/client/${shared}/client`), /client\.js$/)
    assert.match(resolve(`@isomoes/dsh-web-ui/client/${shared}/package.json`), /package\.json$/)
  }
})
