import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { AgentPresets, PresetRoot } from '@deepseek-ai/dsh-agent-presets'

export const name = 'academic-writing-preset'
export const inject = ['agentPresets']
export const ACADEMIC_WRITING_PRESET_ID = 'academic-writing'
export const ACADEMIC_WRITING_PRESET_NAME = 'Academic Writing'
export const ACADEMIC_WRITING_PRESET_ROOT = fileURLToPath(new URL('../preset/', import.meta.url))

type PresetRegistry = Pick<AgentPresets, 'roots'>

export function registerAcademicWritingPresetRoot(agentPresets: PresetRegistry): 'existing' | 'registered' {
  if (agentPresets.roots.some(root => root.path === ACADEMIC_WRITING_PRESET_ROOT)) return 'existing'
  const roots = agentPresets.roots as PresetRoot[]
  roots.unshift({ path: ACADEMIC_WRITING_PRESET_ROOT, trust: 'system' })
  return 'registered'
}

export function apply(ctx: Context): void {
  registerAcademicWritingPresetRoot(ctx.agentPresets)
}
