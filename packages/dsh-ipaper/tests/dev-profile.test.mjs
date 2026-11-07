import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parse } from 'yaml'
import { mergeProfileSettings, migrateDevManifest } from '../../../scripts/profile-settings.mjs'

test('dev migration merges required policy without discarding user settings', () => {
  const source = '# Personal settings\npackages: [extensions/*]\nstoreDir: /custom/store\noverrides:\n  other-plugin: 1.0.0\nallowBuilds:\n  custom-native: false\n'
  const merged = mergeProfileSettings(source)
  const settings = parse(merged)
  assert.match(merged, /# Personal settings/)
  assert.deepEqual(settings.packages, ['.', 'extensions/*'])
  assert.equal(settings.storeDir, '/custom/store')
  assert.equal(settings.overrides['other-plugin'], '1.0.0')
  assert.equal(settings.overrides['@ai4paper/apaper-plugin@0.2.3>@deepseek-ai/dsh-mcp-client'], '0.2.2-rc.1')
  assert.equal(settings.allowBuilds['custom-native'], false)
  assert.equal(settings.nodeLinker, 'hoisted')
  assert.equal(settings.autoInstallPeers, true)
  assert.equal(mergeProfileSettings(merged), merged)
})

test('dev migration replaces historical layering and preserves extensions', () => {
  const source = {
    name: 'my-profile',
    dependencies: { '@isomoes/dsh-web-ui': '0.5.1', 'my-extension': '1.0.0' },
    dsh: { custom: true, profile: { custom: true, bundles: ['@ai4paper/dsh-ipaper', 'my-extension', '@deepseek-ai/dsh-base'] } },
  }
  const migrated = migrateDevManifest(source)
  assert.deepEqual(migrated.dsh.profile.bundles, ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@ai4paper/dsh-ipaper', 'my-extension'])
  assert.deepEqual(migrated.dependencies, { 'my-extension': '1.0.0' })
  assert.equal(migrated.dsh.custom, true)
  assert.equal(migrated.dsh.profile.custom, true)
  assert.deepEqual(migrateDevManifest(migrated), migrated)
  assert.ok(source.dependencies['@isomoes/dsh-web-ui'])
})
