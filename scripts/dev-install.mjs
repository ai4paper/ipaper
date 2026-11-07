import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeProfileSettings, migrateDevManifest } from './profile-settings.mjs'

const root = new URL('../', import.meta.url)
const packageUrl = new URL('../packages/dsh-ipaper/', import.meta.url)
const packageDir = fileURLToPath(packageUrl)
const require = createRequire(packageUrl)
const baseDir = dirname(require.resolve('@deepseek-ai/dsh-base/package.json'))
const webAppDir = dirname(require.resolve('@deepseek-ai/dsh-web-app/package.json'))
const cliDir = dirname(require.resolve('@deepseek-ai/dsh/package.json'))
const apaperPluginDir = fileURLToPath(new URL('../', import.meta.resolve('@ai4paper/apaper-plugin/dsh')))
const manifest = JSON.parse(await readFile(new URL('package.json', packageUrl), 'utf8'))
const dshHome = process.env.DSH_HOME ?? join(homedir(), '.ipaper')
const env = { ...process.env, DSH_HOME: dshHome }

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    stdio: 'inherit',
    ...options,
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${String(result.status)}`)
  }
}

run('pnpm', [
  '--filter', manifest.name,
  'build:package',
])

const profileDir = join(dshHome, 'profiles', 'ipaper-dev')
await mkdir(profileDir, { recursive: true })
async function readOptional(path) {
  try { return await readFile(path, 'utf8') } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return undefined
  }
}
const settingsPath = join(profileDir, 'pnpm-workspace.yaml')
await writeFile(settingsPath, mergeProfileSettings(await readOptional(settingsPath)))
const profileManifestPath = join(profileDir, 'package.json')
const existingManifest = await readOptional(profileManifestPath)
if (existingManifest !== undefined) {
  await writeFile(profileManifestPath, `${JSON.stringify(migrateDevManifest(JSON.parse(existingManifest)), null, 2)}\n`)
}

// Link all direct profile packages into this workspace's dependency graph.
// Linking only IPaper while installing its profile-root dependencies from the
// registry could place a second DSH runtime at the profile root and split
// private service symbols used by linked host plugins.
run('dsh', [
  'plugin', '--profile', 'ipaper-dev', 'add',
  `link:${baseDir}`,
  `link:${cliDir}`,
  `link:${webAppDir}`,
  `link:${apaperPluginDir}`,
  `link:${packageDir}`,
])
const installed = JSON.parse(await readFile(profileManifestPath, 'utf8'))
await writeFile(profileManifestPath, `${JSON.stringify(migrateDevManifest(installed), null, 2)}\n`)
