import assert from 'node:assert/strict'
import { access, cp, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'

const root = new URL('../', import.meta.url)

test('copied frontend contains every root-relative asset', async () => {
  const webRoot = new URL('lib/web/', root)
  const html = await readFile(new URL('index.html', webRoot), 'utf8')
  const references = [...html.matchAll(/(?:src|href)="\/([^"]+)"/g)].map(match => match[1])
  assert.match(html, /<div id="root"><\/div>/)
  assert.ok(references.length > 0)
  await Promise.all(references.map(reference => access(new URL(reference, webRoot))))
})

test('runtime asset lookup remains inside a relocated installed product', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'dsh-ipaper-install-'))
  const installed = join(temp, 'node_modules', '@isomoes', 'dsh-ipaper')
  await mkdir(dirname(installed), { recursive: true })
  await cp(root, installed, { recursive: true, filter: source => !source.includes('/tests') && !source.includes('/client') && !source.includes('/scripts') })
  const workspaceModules = new URL('../../../node_modules/', root).pathname
  await symlink(join(workspaceModules, '@deepseek-ai'), join(temp, 'node_modules', '@deepseek-ai'), 'dir')
  try {
    const module = await import(`${new URL(`file://${installed}/lib/index.js`).href}?installed=${Date.now()}`)
    const index = module.internals.resolveDistIndex()
    assert.ok(index.startsWith(installed), `${index} must remain under ${installed}`)
    await access(index)
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('LAN trust preserves explicit authorities', async () => {
  const { resolveLanTrust, webSurfacePrompt } = await import('../lib/index.js')
  assert.deepEqual(resolveLanTrust('127.0.0.1', ['papers.example']), { lanAddresses: [], trustedHosts: ['papers.example'] })
  const prompt = webSurfacePrompt('http://127.0.0.1:3080')
  assert.match(prompt, /IPaper Web GUI/)
  assert.match(prompt, /window\.__DSH_BOOT__/)
  assert.doesNotMatch(prompt, /coding app|iKanban/i)
})
