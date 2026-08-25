import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { test } from 'node:test'

const root = new URL('../', import.meta.url)

test('registers built-in ipaper before the writable customization root, idempotently', async () => {
  const preset = await import('../lib/academic-writing-preset.js')
  const userRoot = { path: '/user/presets', trust: 'user' }
  const registry = { roots: [userRoot] }
  assert.equal(preset.registerAcademicWritingPresetRoot(registry), 'registered')
  assert.deepEqual(registry.roots, [
    { path: preset.ACADEMIC_WRITING_PRESET_ROOT, trust: 'system' },
    userRoot,
  ])
  assert.equal(preset.registerAcademicWritingPresetRoot(registry), 'existing')
  assert.equal(registry.roots.length, 2)
  assert.equal(preset.ACADEMIC_WRITING_PRESET_ID, 'ipaper')
  assert.equal(preset.ACADEMIC_WRITING_PRESET_NAME, 'ipaper')
  await access(new URL('../preset/ipaper/preset.yml', import.meta.url))
})

test('ships an academic integrity persona and complete useful tools', async () => {
  const source = await readFile(new URL('../preset/ipaper/agent.cordis.yml', import.meta.url), 'utf8')
  for (const phrase of ['Never fabricate citations', 'bibliographic metadata', 'State uncertainty', 'author intent']) assert.match(source, new RegExp(phrase, 'i'))
  for (const row of ['tool-fs', 'tool-web', 'tool-todo', 'tool-subagent', 'plan-mode']) assert.match(source, new RegExp(`- id: ${row}`))
  assert.doesNotMatch(source, /project-mcp|coding agent|iKanban|actual repository|tracked files|formatters|code generation|public APIs?|another engineer|commit/i)
  for (const phrase of ['manuscript', 'argument, evidence, and section structure', 'citation, attribution, and verification gaps', 'author or a collaborator']) {
    assert.match(source, new RegExp(phrase, 'i'))
  }
})

test('startup command uses IPaper academic-writing wording', async () => {
  const { webCommand } = await import('../lib/startup.js')
  const command = webCommand()
  assert.equal(command.name(), 'dsh --profile ipaper')
  assert.match(command.description(), /IPaper academic-writing browser UI/)
  assert.match(command.helpInformation(), /--trusted-host/)
})
