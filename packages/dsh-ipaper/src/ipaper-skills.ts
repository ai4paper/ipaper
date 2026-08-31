import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'

export const IPAPER_SKILL_NAMES = ['find-the-problem'] as const
export const IPAPER_SKILLS_ROOT = fileURLToPath(new URL('../skills/', import.meta.url))

interface SkillRegistration {
  readonly name: string
  readonly description: string
  readonly content: string
  readonly source: 'bundled'
  readonly provider: string
  readonly resourceBase: { readonly kind: 'directory'; readonly path: string }
  readonly path: string
  readonly invocation: {
    readonly modelInvocable: boolean
    readonly userInvocable: boolean
  }
}

interface SkillRegistry {
  register(skill: SkillRegistration): () => void
}

interface SkillContext extends Context {
  readonly skills: SkillRegistry
}

export interface ParsedIPaperSkill {
  readonly name: string
  readonly description: string
  readonly content: string
  readonly modelInvocable: boolean
  readonly userInvocable: boolean
}

function frontmatterValue(frontmatter: string, key: string): string | undefined {
  return new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(frontmatter)?.[1]?.trim()
}

function booleanValue(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  if (value.toLowerCase() === 'true') return true
  if (value.toLowerCase() === 'false') return false
  throw new Error(`ipaper-skills: invalid boolean '${value}'`)
}

export function parseIPaperSkill(source: string): ParsedIPaperSkill {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source)
  if (match === null) throw new Error('ipaper-skills: SKILL.md has no YAML frontmatter')
  const frontmatter = match[1]
  const content = match[2]
  if (frontmatter === undefined || content === undefined) throw new Error('ipaper-skills: malformed SKILL.md')
  const name = frontmatterValue(frontmatter, 'name')
  const description = frontmatterValue(frontmatter, 'description')
  if (name === undefined || description === undefined) throw new Error('ipaper-skills: name and description are required')
  return {
    name,
    description,
    content: content.trimStart(),
    modelInvocable: !booleanValue(frontmatterValue(frontmatter, 'disable-model-invocation'), false),
    userInvocable: booleanValue(frontmatterValue(frontmatter, 'user-invocable'), true),
  }
}

export function ipaperSkillPath(skillName: string): string {
  return resolve(IPAPER_SKILLS_ROOT, skillName, 'SKILL.md')
}

export async function registerIPaperSkills(ctx: Pick<SkillContext, 'skills'>): Promise<() => void> {
  const disposers: (() => void)[] = []
  try {
    for (const expectedName of IPAPER_SKILL_NAMES) {
      const path = ipaperSkillPath(expectedName)
      const parsed = parseIPaperSkill(await readFile(path, 'utf8'))
      if (parsed.name !== expectedName) {
        throw new Error(`ipaper-skills: expected '${expectedName}', found '${parsed.name}'`)
      }
      disposers.push(ctx.skills.register({
        name: parsed.name,
        description: parsed.description,
        content: parsed.content,
        source: 'bundled',
        provider: 'ipaper',
        resourceBase: { kind: 'directory', path: dirname(path) },
        path,
        invocation: {
          modelInvocable: parsed.modelInvocable,
          userInvocable: parsed.userInvocable,
        },
      }))
    }
  } catch (error) {
    for (const dispose of disposers.reverse()) dispose()
    throw error
  }
  return () => {
    for (const dispose of disposers.reverse()) dispose()
  }
}

export const name = 'ipaper-skills'
export const inject = ['skills']

export async function apply(ctx: SkillContext): Promise<void> {
  const dispose = await registerIPaperSkills(ctx)
  ctx.effect(() => dispose, 'ipaper.skills()')
}
