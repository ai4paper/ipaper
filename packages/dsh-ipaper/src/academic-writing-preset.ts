import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { AgentPresets, PresetRoot } from '@deepseek-ai/dsh-agent-presets'

export const name = 'academic-writing-preset'
export const inject = ['agentPresets']
export const ACADEMIC_WRITING_PRESET_ID = 'ipaper'
export const ACADEMIC_WRITING_PRESET_NAME = 'ipaper'
export const ACADEMIC_WRITING_PRESET_ROOT = fileURLToPath(new URL('../preset/', import.meta.url))

type PresetRegistry = Pick<AgentPresets, 'roots'>

export function registerAcademicWritingPresetRoot(agentPresets: PresetRegistry): 'existing' | 'registered' {
  const roots = agentPresets.roots as PresetRoot[]
  if (roots.length === 1 && roots[0]?.path === ACADEMIC_WRITING_PRESET_ROOT && roots[0].trust === 'system') return 'existing'
  roots.splice(0, roots.length, { path: ACADEMIC_WRITING_PRESET_ROOT, trust: 'system' })
  return 'registered'
}

export function apply(ctx: Context): void {
  registerAcademicWritingPresetRoot(ctx.agentPresets)
}
