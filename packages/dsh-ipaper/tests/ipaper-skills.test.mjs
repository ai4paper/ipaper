import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as ipaperSkills from '../lib/ipaper-skills.js'

const {
  IPAPER_SKILL_NAMES,
  IPAPER_SKILLS_ROOT,
  ipaperSkillPath,
  parseIPaperSkill,
  registerIPaperSkills,
} = ipaperSkills

test('registers every packaged IPaper skill for model and user invocation', async () => {
  assert.equal(ipaperSkills.default, undefined)
  assert.deepEqual(ipaperSkills.inject, ['skills'])
  const registered = []
  const disposed = []
  const dispose = await registerIPaperSkills({
    skills: {
      register(skill) {
        registered.push(skill)
        return () => { disposed.push(skill.name) }
      },
    },
  })
  assert.deepEqual(IPAPER_SKILL_NAMES, ['find-the-problem'])
  assert.match(IPAPER_SKILLS_ROOT, /skills[/\\]$/)
  assert.match(ipaperSkillPath('find-the-problem'), /skills[/\\]find-the-problem[/\\]SKILL\.md$/)
  assert.equal(registered.length, IPAPER_SKILL_NAMES.length)
  assert.equal(registered[0].name, 'find-the-problem')
  assert.equal(registered[0].provider, 'ipaper')
  assert.equal(registered[0].source, 'bundled')
  assert.deepEqual(registered[0].invocation, { modelInvocable: true, userInvocable: true })
  assert.equal(registered[0].resourceBase.kind, 'directory')
  assert.match(registered[0].content, /apaper-mcp/i)
  assert.match(registered[0].content, /original paper/i)
  assert.match(registered[0].content, /interest, novelty, and feasibility/i)
  assert.match(registered[0].content, /Never fabricate citations/i)
  dispose()
  assert.deepEqual(disposed, ['find-the-problem'])
})

test('rejects missing metadata and invalid invocation booleans', () => {
  assert.throws(() => parseIPaperSkill('# no frontmatter'), /no YAML frontmatter/)
  assert.throws(() => parseIPaperSkill('---\nname: find-the-problem\n---\nBody'), /name and description/)
  assert.throws(() => parseIPaperSkill('---\nname: find-the-problem\ndescription: Test\nuser-invocable: maybe\n---\nBody'), /invalid boolean/)
})
