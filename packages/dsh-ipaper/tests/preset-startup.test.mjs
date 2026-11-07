import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { test } from 'node:test'

test('registers system preset before user copies and prevents user shadowing', async t => {
  const preset = await import('../lib/academic-writing-preset.js')
  const root = await mkdtemp(join(tmpdir(), 'ipaper-presets-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await cp(new URL('../preset/ipaper', import.meta.url), join(root, 'custom'), { recursive: true })
  await mkdir(join(root, 'ipaper'))
  // Deliberately invalid shadow: it must never be read or evaluated.
  await writeFile(join(root, 'ipaper', 'preset.yml'), 'name: [')
  const definitions = []
  const released = []
  const dispose = await preset.registerAcademicWritingPresets({
    async register(definition) {
      definitions.push(definition)
      return async () => { released.push(definition.id) }
    },
  }, [...preset.academicWritingPresetRoots(root)].reverse())
  assert.deepEqual(definitions.map(row => row.id), ['ipaper', 'custom'])
  assert.equal(definitions[0].plugins.find(row => row.id === 'tool-bash').disabled.__jsExpr, "process.platform === 'win32'")
  assert.match(definitions[0].plugins.find(row => row.id === 'persona').config.prefix, /Never fabricate citations/)
  await dispose()
  await dispose()
  assert.deepEqual(released, ['custom', 'ipaper'])
})

test('missing user root is optional and invalid user compositions roll back registrations', async t => {
  const preset = await import('../lib/academic-writing-preset.js')
  const root = await mkdtemp(join(tmpdir(), 'ipaper-presets-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const released = []
  const registry = { async register(definition) { return async () => { released.push(definition.id) } } }
  const dispose = await preset.registerAcademicWritingPresets(registry, preset.academicWritingPresetRoots(join(root, 'missing')))
  await dispose()
  assert.deepEqual(released, ['ipaper'])
  await mkdir(join(root, 'broken'))
  await writeFile(join(root, 'broken', 'preset.yml'), 'name: broken')
  await writeFile(join(root, 'broken', 'agent.cordis.yml'), 'not: an-entry-list')
  await assert.rejects(preset.registerAcademicWritingPresets(registry, preset.academicWritingPresetRoots(root)), /entry|array|list/i)
  assert.deepEqual(released, ['ipaper', 'ipaper'])
})

test('ships an academic integrity persona and complete useful tools', async () => {
  const source = await readFile(new URL('../preset/ipaper/agent.cordis.yml', import.meta.url), 'utf8')
  for (const phrase of ['Never fabricate citations', 'bibliographic metadata', 'State uncertainty', 'author intent']) assert.match(source, new RegExp(phrase, 'i'))
  for (const row of ['tool-fs', 'tool-web', 'tool-todo', 'tool-subagent', 'plan-mode', 'apaper-plugin', 'ipaper-skills', 'product-protocol', 'paper-project-tools']) assert.match(source, new RegExp(`- id: ${row}`))
  for (const row of ['tool-ralph', 'tool-workflow', 'workflow-worker-thread', 'tool-subagent-fork']) assert.doesNotMatch(source, new RegExp(`- id: ${row}`))
  assert.match(source, /name: '@ai4paper\/apaper-plugin\/dsh'/)
  assert.match(source, /name: '@ai4paper\/dsh-ipaper\/ipaper-skills'/)
  assert.ok(source.indexOf('- id: skill-filesystem') < source.indexOf('- id: ipaper-skills'))
  assert.ok(source.indexOf('- id: ipaper-skills') < source.indexOf('- id: apaper-plugin'))
  assert.doesNotMatch(source, /project-mcp|coding agent|iKanban|actual repository|tracked files|formatters|code generation|public APIs?|another engineer|commit/i)
  for (const phrase of ['manuscript', 'argument, evidence, and section structure', 'citation, attribution, and verification gaps', 'author or a collaborator']) {
    assert.match(source, new RegExp(phrase, 'i'))
  }
  const protocol = await import('../lib/product-protocol.js')
  assert.equal(protocol.IPAPER_PROTOCOL_SECTION, 'ipaper:paper-project-protocol')
  assert.equal(protocol.IPAPER_PROTOCOL_ORDER, 10)
  for (const phrase of ['ipaper_record', 'ipaper_state', 'taskId', 'expectedVersion', 'call-local refs', 'no fixed stages', 'Never promote a claim']) {
    assert.match(protocol.IPAPER_PRODUCT_PROTOCOL, new RegExp(phrase, 'i'))
  }
})

test('product patch inherits upstream startup and only contributes product rows', async () => {
  const source = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /name: '@deepseek-ai\/dsh-(?:web-app|client-|host-)/)
  assert.doesNotMatch(source, /webRuntime|trustedHosts|typert-loader/)
  assert.match(source, /id: connection\n  inject: \[webStartup, webServer\]/)
  for (const id of ['standard', 'minimal', 'cordis', 'ptc']) assert.match(source, new RegExp(`id: preset-${id}\\n  disabled: true`))
  assert.match(source, /id: agent-preset-registry\n  config:\n    default: ipaper/)
})
