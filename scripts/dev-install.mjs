import { spawnSync } from 'node:child_process'
import { access, copyFile, mkdir, readFile, readdir, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(await readFile(new URL('../packages/dsh-ipaper/package.json', import.meta.url), 'utf8'))
const dshHome = join(homedir(), '.ipaper')
const packDir = join(dshHome, 'profiles/ipaper-dev/.ipaper-dev')
const tarballName = `${manifest.name.slice(1).replaceAll('/', '-')}-${manifest.version}.tgz`
const tarballPath = join(packDir, tarballName)
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

// Keep the currently installed archive until pnpm has switched the profile to
// the new one. Removing it first makes version changes fail while pnpm resolves
// the profile's existing file: dependency.
await mkdir(packDir, { recursive: true })
await rm(tarballPath, { force: true })

// Install an archive, not a workspace link. Node resolves a linked package
// through this checkout and can load a second instance of DSH's private service
// symbols; a packed install shares the profile's dependency graph.
run('pnpm', [
  '--filter', '@ai4paper/dsh-ipaper',
  'pack', '--pack-destination', packDir,
])

// Heal a profile left by the old installer, which deleted its referenced
// archive before asking pnpm to replace that dependency.
const profileManifestPath = join(dshHome, 'profiles/ipaper-dev/package.json')
try {
  const profile = JSON.parse(await readFile(profileManifestPath, 'utf8'))
  const previousSource = profile.dependencies?.[manifest.name]
  const previousTarball = typeof previousSource === 'string' && previousSource.startsWith('file:')
    ? previousSource.slice('file:'.length)
    : undefined
  if (previousTarball?.startsWith(`${packDir}/`) && previousTarball !== tarballPath) {
    try {
      await access(previousTarball)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
      await copyFile(tarballPath, previousTarball)
    }
  }
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}

const tarballs = (await readdir(packDir)).filter(file => file.endsWith('.tgz'))
if (!tarballs.includes(tarballName)) {
  throw new Error(`Expected IPaper development tarball ${tarballName}`)
}
run('dsh', [
  'plugin', '--profile', 'ipaper-dev', 'add',
  '@isomoes/dsh-web-ui@0.5.1',
  tarballPath,
])
await Promise.all(tarballs
  .filter(file => file !== tarballName)
  .map(file => rm(join(packDir, file), { force: true })))
