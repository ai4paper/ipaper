import { spawn } from 'node:child_process'
import { watch } from 'node:fs'
import { copyFile, rename } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const cwd = fileURLToPath(new URL('..', import.meta.url))
const outputDirectory = join(cwd, 'lib/clients/ui-brand-ipaper')
const source = join(outputDirectory, 'client.js')
const dshHome = process.env.DSH_HOME ?? join(homedir(), '.ipaper')
const installed = join(
  dshHome,
  'profiles/ipaper-dev/node_modules/@ai4paper/dsh-ipaper/lib/clients/ui-brand-ipaper/client.js',
)
const staged = `${installed}.ipaper-dev-tmp`

// Development uses a packed profile install so every plugin shares the
// profile's DSH module instances. Mirror only the watched browser artifact into
// that install; client HMR then observes the same file the server actually owns.
let timer
let copyQueue = Promise.resolve()
const outputWatcher = watch(outputDirectory, (_event, filename) => {
  if (filename !== 'client.js') return
  clearTimeout(timer)
  timer = setTimeout(() => {
    copyQueue = copyQueue
      // Replace the profile entry atomically instead of writing through pnpm's
      // content-addressed hardlink into the package store.
      .then(async () => {
        await copyFile(source, staged)
        await rename(staged, installed)
      })
      .catch(error => console.error(`Failed to update installed IPaper brand: ${String(error)}`))
  }, 50)
})

const child = spawn('pnpm', ['exec', 'tsdown', '--watch'], { cwd, stdio: 'inherit' })
child.once('error', error => { throw error })
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal))
child.once('exit', (code, signal) => {
  clearTimeout(timer)
  outputWatcher.close()
  if (signal === null && code !== 0) process.exitCode = code ?? 1
})
console.log('Watching the IPaper branding client; shared Web UI source is dependency-owned and is not watched here.')
