import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { profileSettings } from './profile-settings.mjs'

const temp = await mkdtemp(join(process.env.TMPDIR ?? tmpdir(), 'dsh-ipaper-pack-'))
const extracted = join(temp, 'extracted')
const home = join(temp, 'home')
const env = { ...process.env, DSH_HOME: home }
const version = '0.2.2-rc.1'
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { cwd: new URL('../', import.meta.url), env, stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited with ${String(result.status)}`)
  return result.stdout
}

let server
let serverClosed = Promise.resolve()
try {
  run('pnpm', ['--filter', '@ai4paper/dsh-ipaper', 'pack', '--pack-destination', temp])
  const tarballs = (await readdir(temp)).filter(file => file.endsWith('.tgz'))
  assert.equal(tarballs.length, 1)
  const tarball = join(temp, tarballs[0])
  await mkdir(extracted)
  run('tar', ['-xzf', tarball, '-C', extracted])
  run(process.execPath, ['scripts/validate-package.mjs', join(extracted, 'package')])
  const profile = join(home, 'profiles', 'pack-check')
  await mkdir(profile, { recursive: true })
  await writeFile(join(profile, 'pnpm-workspace.yaml'), profileSettings)
  run('pnpm', ['exec', 'dsh', 'plugin', '--profile', 'pack-check', 'add',
    `@deepseek-ai/dsh-base@${version}`, `@deepseek-ai/dsh-web-app@${version}`,
    '--registry=https://registry.npmjs.org'])
  run('pnpm', ['exec', 'dsh', 'plugin', '--profile', 'pack-check', 'add',
    tarball, '@ai4paper/apaper-plugin@0.2.3', `@deepseek-ai/dsh@${version}`, '--registry=https://registry.npmjs.org'])
  const installed = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
  assert.deepEqual(installed.dsh.profile.bundles, [
    '@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@ai4paper/dsh-ipaper',
  ])
  assert.ok(!JSON.stringify(installed).includes('@isomoes/dsh-web-ui'))
  const profileRequire = createRequire(join(profile, 'package.json'))
  const apaperRequire = createRequire(join(profile, 'node_modules/@ai4paper/apaper-plugin/dsh/index.js'))
  assert.equal(apaperRequire.resolve('@deepseek-ai/dsh-mcp-client'), profileRequire.resolve('@deepseek-ai/dsh-mcp-client'), 'APaper must share the upstream MCP adapter identity')
  assert.equal(apaperRequire('@deepseek-ai/dsh-mcp-client/package.json').version, version)
  const cliRequire = createRequire(profileRequire.resolve('@deepseek-ai/dsh/package.json'))
  const bootRequire = createRequire(profileRequire.resolve('@deepseek-ai/dsh-app-boot'))
  assert.equal(cliRequire.resolve('@deepseek-ai/dsh-app-boot'), profileRequire.resolve('@deepseek-ai/dsh-app-boot'))
  assert.equal(bootRequire.resolve('@deepseek-ai/cordis-plugin-include'), profileRequire.resolve('@deepseek-ai/cordis-plugin-include'))
  server = spawn('pnpm', ['exec', 'dsh', '--profile', 'pack-check', '--host', '127.0.0.1', '--port', '0', '--no-open'], {
    cwd: profile, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  })
  serverClosed = new Promise(resolve => { server.once('close', resolve) })
  let logs = ''
  const authenticatedUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Packed profile did not start:\n${logs}`)), 90000)
    const consume = chunk => {
      logs += chunk.toString()
      const match = logs.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/)
      if (match) { clearTimeout(timer); resolve(match[1]) }
    }
    server.stdout.on('data', consume)
    server.stderr.on('data', consume)
    server.once('error', error => { clearTimeout(timer); reject(error) })
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Packed profile exited ${code}:\n${logs}`)) })
  })
  const exchange = await fetch(authenticatedUrl, { redirect: 'manual' })
  assert.equal(exchange.status, 303)
  const cookie = exchange.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie, 'launch-token exchange must issue a browser cookie')
  const origin = new URL(authenticatedUrl).origin
  const request = async (path, options = {}) => {
    const response = await fetch(new URL(path, `${origin}/`), {
      ...options, headers: { cookie, origin, ...options.headers }, signal: AbortSignal.timeout(10000),
    })
    assert.equal(response.status, 200, `${path}: ${await response.clone().text()}`)
    return response
  }
  const html = await (await request('/')).text()
  assert.match(html, /<title>IPaper<\/title>/)
  const bootMatch = html.match(/globalThis\["__DSH_BOOT__"\]\s*=\s*([\s\S]*?)<\/script>/)
  assert.ok(bootMatch, 'upstream Web must inject its boot graph')
  const boot = JSON.parse(bootMatch[1].replace(/;\s*$/, ''))
  const ids = boot.entries.map(entry => entry.id)
  assert.equal(new Set(ids).size, ids.length, 'browser module identities must be unique')
  for (const id of ['@deepseek-ai/dsh-client-connection', '@deepseek-ai/dsh-client-ui-conversation', '@ai4paper/dsh-ipaper']) {
    assert.ok(ids.includes(id), `missing browser module ${id}; found ${ids.join(', ')}`)
  }
  assert.ok(ids.every(id => !id.includes('@isomoes/')))
  for (const batch of boot.batches) await request(batch.url)
  const manifestPath = html.match(/<link[^>]*rel="manifest"[^>]*href="([^"]+)"/)?.[1]
    ?? html.match(/<link[^>]*href="([^"]+)"[^>]*rel="manifest"/)?.[1]
  assert.ok(manifestPath, 'HTML must link a manifest')
  const manifest = await (await request(manifestPath)).json()
  assert.equal(manifest.name, 'IPaper')
  assert.equal(await (await request('/favicon.svg')).text(), await readFile(join(extracted, 'package/lib/web/favicon.svg'), 'utf8'))
  for (const icon of manifest.icons ?? []) await request(new URL(icon.src, new URL(manifestPath, `${origin}/`)))
  const rpc = await (await request('/ipaper/paper-project/status', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: 'pack-check', method: 'paper-project/status', payload: { workspaceId: 'pack-check-missing' } }),
  })).json()
  assert.deepEqual(rpc.result, { ok: true, value: null })
  const api = async (method, args) => {
    const result = await (await request(`/api/${method}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: `pack-${method}`, method, payload: { args } }),
    })).json()
    assert.equal(result.result.ok, true, `${method}: ${JSON.stringify(result.result)}`)
    return result.result.value
  }
  const settings = await api('settings/mutate', {
    ns: 'ui-settings-general',
    ops: [{ op: 'set', path: ['welcomeNoticeVersion'], value: '2026-09-28.1' }],
  })
  assert.equal(settings.value.welcomeNoticeVersion, '2026-09-28.1')
  assert.ok(settings.revision > 0, 'settings writes must survive a real profile reload')
  const roster = await api('agentPresets/list', {})
  const preset = roster.presets.find(row => row.id === 'ipaper')
  assert.ok(preset?.isDefault, 'IPaper must be the default preset')
  assert.equal(preset.broken, undefined, 'the packaged preset must activate without diagnostics')
  const workspace = join(temp, 'paper-workspace')
  await mkdir(workspace)
  const session = await api('session/create', { request: { cwd: workspace, agentPreset: 'ipaper' } })
  assert.equal(session.agentPreset, 'ipaper')
  const catalog = await api('skills/list', { request: { sessionId: session.sessionId } })
  for (const name of ['find-the-problem', 'writing', 'creating-figures']) {
    const skill = catalog.skills.find(row => row.name === name)
    assert.ok(skill, `missing packaged skill ${name}`)
    assert.ok(skill.path.startsWith(join(profile, 'node_modules')), `${name} must resolve from the clean profile`)
  }
  console.log(`Pack check passed: ${tarballs[0]} (upstream runtime, branding, ${ids.length} modules, Paper Project RPC, live settings reload, preset/session/skills)`)
} finally {
  if (server?.pid) {
    try { process.kill(-server.pid, 'SIGTERM') } catch (error) { if (error.code !== 'ESRCH') throw error }
    const timeout = setTimeout(() => {
      try { process.kill(-server.pid, 'SIGKILL') } catch (error) { if (error.code !== 'ESRCH') console.error(error) }
    }, 5000)
    try { await serverClosed } finally { clearTimeout(timeout) }
  }
  if (process.env.PACK_CHECK_KEEP === '1') console.log(`Retained packed profile: DSH_HOME=${home} pnpm --dir ${join(home, 'profiles/pack-check')} exec dsh --profile pack-check --no-open`)
  else await rm(temp, { recursive: true, force: true, maxRetries: 3 })
}
