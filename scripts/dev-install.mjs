import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const packageUrl = new URL('../packages/dsh-ipaper/', import.meta.url)
const packageDir = fileURLToPath(packageUrl)
const require = createRequire(packageUrl)
const webUiDir = dirname(require.resolve('@isomoes/dsh-web-ui/package.json'))
const apaperPluginDir = fileURLToPath(new URL('../', import.meta.resolve('@ai4paper/apaper-plugin/dsh')))
const manifest = JSON.parse(await readFile(new URL('package.json', packageUrl), 'utf8'))
const dshHome = join(homedir(), '.ipaper')
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

// Link all direct profile packages into this workspace's dependency graph.
// Linking only IPaper while installing its profile-root dependencies from the
// registry could place a second DSH runtime at the profile root and split
// private service symbols used by linked host plugins.
run('dsh', [
  'plugin', '--profile', 'ipaper-dev', 'add',
  `link:${webUiDir}`,
  `link:${apaperPluginDir}`,
  `link:${packageDir}`,
])
