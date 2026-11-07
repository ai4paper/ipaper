import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { entryListProblem, type AgentPresetRegistry, type PresetDefinition } from '@deepseek-ai/dsh-agent-preset-registry'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { parseDocument } from 'yaml'

export const name = 'academic-writing-preset'
export const inject = ['agentPresets']
export const ACADEMIC_WRITING_PRESET_ID = 'ipaper'
export const ACADEMIC_WRITING_PRESET_NAME = 'ipaper'
export const ACADEMIC_WRITING_PRESET_ROOT = fileURLToPath(new URL('../preset/', import.meta.url))

export interface PresetRoot {
  readonly path: string
  readonly trust: 'system' | 'user'
}

/** The package-owned root always wins; user files are executable compositions. */
export function academicWritingPresetRoots(userRoot = join(resolveDshHome(), '.agent-presets')): readonly PresetRoot[] {
  return [
    { path: ACADEMIC_WRITING_PRESET_ROOT, trust: 'system' },
    { path: userRoot, trust: 'user' },
  ]
}

function parseYaml(source: string, path: string): unknown {
  const document = parseDocument(source, {
    customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value: string) => ({ __jsExpr: value }) }],
  })
  if (document.errors.length > 0) throw new Error(`${path}: ${document.errors.map(error => error.message).join('; ')}`)
  return document.toJS() as unknown
}

/** Read only supported metadata and preserve Loader expressions without evaluating them. */
export async function readAcademicPreset(path: string, id: string): Promise<PresetDefinition> {
  const metadataPath = join(path, 'preset.yml')
  const metadata = parseYaml(await readFile(metadataPath, 'utf8'), metadataPath)
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error(`${metadataPath}: expected preset metadata`)
  const values = metadata as Record<string, unknown>
  const compositionPath = join(path, 'agent.cordis.yml')
  const plugins = parseYaml(await readFile(compositionPath, 'utf8'), compositionPath)
  const problem = entryListProblem(plugins, compositionPath)
  if (problem !== undefined) throw new Error(problem)
  return {
    id,
    ...(typeof values.name === 'string' ? { name: values.name } : {}),
    ...(typeof values.description === 'string' ? { description: values.description } : {}),
    ...(typeof values.order === 'number' ? { order: values.order } : {}),
    plugins: plugins as PresetDefinition['plugins'],
  }
}

/** Register immutable packaged definitions first, then user-authored copies at boot.
 * The registry exposes read-only documents; this adapter never writes either root.
 * A user directory cannot replace a system identity. Invalid files fail startup.
 */
export async function registerAcademicWritingPresets(
  registry: Pick<AgentPresetRegistry, 'register'>,
  roots: readonly PresetRoot[] = academicWritingPresetRoots(),
): Promise<() => Promise<void>> {
  const seen = new Set<string>()
  const disposers: (() => Promise<void>)[] = []
  const dispose = async (): Promise<void> => {
    for (const release of disposers.splice(0).reverse()) await release()
  }
  try {
    for (const root of [...roots].sort((left, right) => Number(right.trust === 'system') - Number(left.trust === 'system'))) {
      const entries = await readdir(root.path, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT' && root.trust === 'user') return []
        throw error
      })
      for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        if (!entry.isDirectory() || entry.name.startsWith('.') || seen.has(entry.name)) continue
        const definition = await readAcademicPreset(join(root.path, entry.name), entry.name)
        seen.add(definition.id)
        disposers.push(await registry.register(definition))
      }
    }
    return dispose
  } catch (error) {
    await dispose()
    throw error
  }
}

export async function apply(ctx: Context): Promise<void> {
  const dispose = await registerAcademicWritingPresets(ctx.agentPresets)
  ctx.effect(() => dispose, 'ipaper.academicWritingPresets()')
}
