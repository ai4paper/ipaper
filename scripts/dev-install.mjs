import { spawnSync } from 'node:child_process'
import { mkdir, readdir, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const root = new URL('../', import.meta.url)
const dshHome = join(homedir(), '.ipaper')
const packDir = join(dshHome, 'profiles/ipaper-dev/.ipaper-dev')
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

// Keep the archive inside the profile: pnpm records its file: source in the
// manifest and lockfile, so deleting a temporary archive would break the next
// profile install or update.
await rm(packDir, { recursive: true, force: true })
await mkdir(packDir, { recursive: true })

// Install an archive, not a workspace link. Node resolves a linked package
// through this checkout and can load a second instance of DSH's private service
// symbols; a packed install shares the profile's dependency graph.
run('pnpm', [
  '--filter', '@isomoes/dsh-ipaper',
  'pack', '--pack-destination', packDir,
])
const tarballs = (await readdir(packDir)).filter(file => file.endsWith('.tgz'))
if (tarballs.length !== 1) {
  throw new Error(`Expected one IPaper development tarball, found ${tarballs.length}`)
}
run('dsh', [
  'plugin', '--profile', 'ipaper-dev', 'add',
  '@isomoes/dsh-web-ui@0.5.1',
  join(packDir, tarballs[0]),
])
