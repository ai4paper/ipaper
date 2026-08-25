import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
if (args[0] === '--') args.shift()

const dshEnv = { ...process.env, DSH_HOME: join(homedir(), '.ipaper') }
const children = [
  spawn(process.execPath, ['packages/dsh-ipaper/scripts/watch-brand.mjs'], { stdio: 'inherit' }),
  spawn('dsh', ['--profile', 'ipaper-dev', ...args], { stdio: 'inherit', env: dshEnv }),
]
const exits = children.map(child => new Promise((resolve, reject) => {
  child.once('error', reject)
  child.once('exit', (code, signal) => resolve({ code, signal }))
}))
let stopping = false
function stop(signal = 'SIGTERM') {
  if (stopping) return
  stopping = true
  for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill(signal)
}
process.once('SIGINT', () => stop('SIGINT'))
process.once('SIGTERM', () => stop('SIGTERM'))
try {
  const result = await Promise.race(exits)
  stop()
  await Promise.allSettled(exits)
  if (result.code !== 0 && result.signal === null) process.exitCode = result.code ?? 1
} catch (error) {
  stop()
  await Promise.allSettled(exits)
  throw error
}
