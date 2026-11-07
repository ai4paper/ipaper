import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
const composition = await readFile(new URL('cordis.patch.yml', root), 'utf8')
const agentComposition = await readFile(new URL('preset/ipaper/agent.cordis.yml', root), 'utf8')

test('publishes a product extension over exact upstream Web without the retired fork', () => {
  assert.equal(manifest.name, '@ai4paper/dsh-ipaper')
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.exports['./src/*'], undefined)
  assert.doesNotMatch(JSON.stringify(manifest), /@isomoes\/dsh-web-ui/)
  for (const [name, version] of Object.entries(manifest.dependencies)) {
    if (name.startsWith('@deepseek-ai/dsh-')) assert.equal(version, '0.2.2-rc.1', name)
  }
  for (const path of ['preset/ipaper/**', 'skills/**']) assert.ok(manifest.files.includes(path))
})

test('product patch inherits upstream startup and browser roster', () => {
  assert.doesNotMatch(composition, /@isomoes\/dsh-web-ui/)
  assert.doesNotMatch(composition, /name: ['"]@deepseek-ai\/dsh-client-(?:connection|ui-conversation|ui-timeline)['"]|name: ['"]@ai4paper\/dsh-ipaper\/startup['"]/)
  assert.match(composition, /name: '@ai4paper\/dsh-ipaper'/)
  assert.equal(manifest.exports['./client'], './lib/client.js')
  assert.equal(manifest.dsh.client.platform, 'web')
  assert.doesNotMatch(composition, /@ai4paper\/dsh-ipaper\/client\//)
  assert.match(composition, /default: ipaper/)
})

test('publishes product service and preset entrypoints', () => {
  for (const [entry, file] of [
    ['paper-project', 'paper-project/index'],
    ['paper-project-remote', 'paper-project-remote'],
    ['paper-project-tools', 'paper-project/tools'],
    ['product-protocol', 'product-protocol'],
    ['ipaper-skills', 'ipaper-skills'],
  ]) {
    assert.deepEqual(manifest.exports[`./${entry}`], {
      types: `./lib/types/${file}.d.ts`,
      default: `./lib/${file}.js`,
    })
  }
  assert.match(composition, /name: '@ai4paper\/dsh-ipaper\/paper-project'/)
  assert.match(composition, /name: '@ai4paper\/dsh-ipaper\/paper-project-remote'/)
  assert.match(composition, /inject: \[connection, paperProjects, webServer\]/)
  for (const entry of ['paper-project-tools', 'product-protocol', 'ipaper-skills']) {
    assert.ok(agentComposition.includes(`@ai4paper/dsh-ipaper/${entry}`))
  }
})
