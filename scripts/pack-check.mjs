import { mkdtemp, mkdir, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const temp = await mkdtemp(join(tmpdir(), 'dsh-ipaper-pack-'))
const extracted = join(temp, 'extracted')
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: new URL('../', import.meta.url), stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited with ${String(result.status)}`)
}

try {
  run('pnpm', ['--filter', '@isomoes/dsh-ipaper', 'pack', '--pack-destination', temp])
  const tarballs = (await readdir(temp)).filter(file => file.endsWith('.tgz'))
  if (tarballs.length !== 1) throw new Error(`Expected one tarball, found ${tarballs.length}`)
  await mkdir(extracted)
  run('tar', ['-xzf', join(temp, tarballs[0]), '-C', extracted])
  run(process.execPath, ['scripts/validate-package.mjs', join(extracted, 'package')])
  console.log(`Pack check passed: ${tarballs[0]}`)
} finally {
  await rm(temp, { recursive: true, force: true })
}
