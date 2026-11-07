import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import * as apaper from '@ai4paper/apaper-plugin/dsh'
import { registerIPaperSkills } from '../lib/ipaper-skills.js'

// Resolve shared services from the upstream base layer, as the profile does.
const require = createRequire(import.meta.url)
const baseRequire = createRequire(require.resolve('@deepseek-ai/dsh-base/package.json'))
const { Context } = await import(pathToFileURL(baseRequire.resolve('@deepseek-ai/cordis')).href)
const { SkillRegistry } = await import(pathToFileURL(baseRequire.resolve('@deepseek-ai/dsh-skill')).href)

test('APaper and IPaper skills register against the target upstream registry', async t => {
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  await ctx.plugin(SkillRegistry).await()
  const transports = []
  const adapter = {
    root: ctx.root,
    get skills() { return ctx.skills },
    plugin(plugin, config) {
      assert.equal(typeof plugin.apply, 'function')
      transports.push(config)
      return { async await() {} }
    },
  }
  await apaper.apply(adapter)
  const dispose = await registerIPaperSkills(ctx)
  t.after(dispose)
  assert.deepEqual((await ctx.skills.list()).map(skill => skill.name).sort(), ['creating-figures', 'find-the-problem', 'writing'])
  for (const name of ['creating-figures', 'writing']) {
    const skill = await ctx.skills.get(name)
    assert.ok(skill.content.length > 100)
    assert.equal(skill.provider, 'apaper-plugin')
    assert.equal(skill.resourceBase.kind, 'directory')
    assert.deepEqual(skill.invocation, { modelInvocable: true, userInvocable: true })
  }
  assert.equal(transports.length, 1)
  assert.equal(transports[0].transport, 'stdio')
  assert.equal(transports[0].command, 'npx')
  assert.deepEqual(transports[0].args, ['-y', '@ai4paper/apaper-mcp'])
  assert.equal(transports[0].failOnStartupError, true)
})
