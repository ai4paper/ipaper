import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const cwd = fileURLToPath(new URL('..', import.meta.url))
const child = spawn('pnpm', ['exec', 'tsdown', '--watch'], { cwd, stdio: 'inherit' })
child.once('error', error => { throw error })
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal))
child.once('exit', (code, signal) => {
  if (signal === null && code !== 0) process.exitCode = code ?? 1
})
console.log('Watching the IPaper branding client; shared Web UI source is dependency-owned and is not watched here.')
