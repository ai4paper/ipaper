import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

// Run only against an isolated, locally hosted packed profile: this check creates
// a workspace/session and changes appearance settings, but never prompts a model.
const url = process.argv[2]
if (!url) throw new Error('Usage: pnpm browser:check <authenticated URL of an isolated packed profile>')
const origin = new URL(url).origin
const workspacePath = await mkdtemp(join(process.env.TMPDIR ?? tmpdir(), 'ipaper-browser-'))
await writeFile(join(workspacePath, 'migration-paper.md'), '# Migration reference fixture\n')
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  headless: true,
})
const page = await browser.newPage()
const errors = []
const promptRequests = []
page.on('pageerror', error => errors.push(error.message))
page.on('request', request => {
  if (request.url().includes('prompt')) promptRequests.push(new URL(request.url()).pathname)
})
let rpcId = 0
async function referenceRequestsReady(started, filesReady) {
  let timer
  try {
    await Promise.race([
      Promise.all([started, filesReady]),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Reference requests did not reach the browser interceptors')), 30000) }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
async function rpc(method, request) {
  const response = await page.request.post(`${origin}/api/${method}`, {
    headers: { origin },
    data: { type: 'client-request', rpcId: `browser-check-${++rpcId}`, method, payload: { args: { request } } },
  })
  assert.equal(response.status(), 200, method)
  const envelope = await response.json()
  assert.equal(envelope.result.ok, true, `${method}: ${JSON.stringify(envelope.result)}`)
  return envelope.result.value
}
async function settings() {
  await page.getByRole('button', { name: 'Account menu', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click()
  await page.getByRole('dialog', { name: 'Settings', exact: true }).waitFor()
}
try {
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.locator('[data-slot="sidebar.brand.name"] svg[aria-label="IPaper"]').waitFor()
  const notice = page.getByRole('dialog', { name: 'Preview Notice', exact: true })
  if (await notice.isVisible()) {
    await notice.getByRole('button', { name: 'Continue', exact: true }).click()
    await notice.waitFor({ state: 'hidden' })
  }
  await page.waitForFunction(() => document.title.endsWith('IPaper'))
  const manifestUrl = await page.locator('link[rel="manifest"]').getAttribute('href')
  assert.equal((await (await page.request.get(new URL(manifestUrl, origin).href)).json()).name, 'IPaper')

  await settings()
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await page.getByRole('button', { name: 'Dark', exact: true }).and(page.locator('[aria-pressed="true"]')).waitFor()
  await page.getByRole('button', { name: 'Edit shortcuts', exact: true }).click()
  const shortcuts = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true })
  await shortcuts.waitFor()
  assert.match(await shortcuts.innerText(), /Archive session/)
  if (process.platform === 'linux') {
    const archive = shortcuts.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Edit shortcut for Archive session', exact: true }) })
    assert.match(await archive.innerText(), /No shortcut/)
  }
  await page.getByRole('button', { name: 'Close keyboard shortcuts', exact: true }).click()
  await page.getByRole('dialog', { name: 'Settings', exact: true }).getByRole('button', { name: 'Close', exact: true }).click()
  await page.reload({ waitUntil: 'networkidle' })
  await settings()
  assert.equal(await page.getByRole('button', { name: 'Dark', exact: true }).getAttribute('aria-pressed'), 'true')
  if (process.env.IPAPER_COLORBLIND === '1') {
    await page.waitForFunction(() => getComputedStyle(document.body).getPropertyValue('--dsw-alias-state-success-primary').trim().toLowerCase() === '#56b4e9')
  }
  await page.getByRole('dialog', { name: 'Settings', exact: true }).getByRole('button', { name: 'Close', exact: true }).click()

  const { workspace } = await rpc('workspace/create', { path: workspacePath })
  await page.getByRole('button', { name: 'Choose workspace', exact: true }).click()
  const [creation] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/session/create' && response.request().method() === 'POST'),
    page.getByRole('menuitem', { name: workspace.title, exact: true }).click(),
  ])
  const created = await creation.json()
  assert.equal(created.result.ok, true)
  const sessionId = created.result.value.sessionId
  const composer = page.getByRole('textbox', { name: /commands, @ files or sessions/ })
  await composer.waitFor()
  await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'textbox' || document.activeElement?.getAttribute('contenteditable') === 'true')
  await rpc('session/rename', { sessionId, title: 'Migration browser check' })
  await page.waitForFunction(() => document.title === 'Migration browser check — IPaper')
  await rpc('session/rename', { sessionId, title: 'Renamed browser check' })
  await page.waitForFunction(() => document.title === 'Renamed browser check — IPaper')

  // Controlled browser responses reproduce latency coupling without depending on
  // filesystem speed. Cancellation assertions cover rendering, not server work.
  let releaseSessions
  let sessionStarted
  let fileFinished
  let sessionCalls = 0
  let candidate = 'migration-paper.md'
  let gate = new Promise(resolve => { releaseSessions = resolve })
  let started = new Promise(resolve => { sessionStarted = resolve })
  let filesReady = new Promise(resolve => { fileFinished = resolve })
  const reply = (body, value) => ({ type: 'server-response', rpcId: body.rpcId, result: { ok: true, value } })
  const fileRoute = requestUrl => requestUrl.pathname.endsWith('/fileReferences/list')
  const sessionRoute = requestUrl => requestUrl.pathname.endsWith('/sessionReferenceResolver/candidates')
  await page.route(fileRoute, async route => {
    await route.fulfill({ json: reply(route.request().postDataJSON(), [{ path: candidate, kind: 'file' }]) })
    fileFinished()
  })
  await page.route(sessionRoute, async route => {
    sessionCalls++
    const pending = gate
    sessionStarted()
    await pending
    await route.fulfill({ json: reply(route.request().postDataJSON(), []) })
  })
  await composer.fill('@migration')
  await referenceRequestsReady(started, filesReady)
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.equal(await page.getByText(candidate, { exact: true }).count(), 0, 'pinned upstream waits for session suggestions')
  releaseSessions()
  await page.getByText(candidate, { exact: true }).waitFor()

  candidate = 'stale-paper.md'
  gate = new Promise(resolve => { releaseSessions = resolve })
  started = new Promise(resolve => { sessionStarted = resolve })
  filesReady = new Promise(resolve => { fileFinished = resolve })
  await composer.fill('@stale')
  await referenceRequestsReady(started, filesReady)
  await composer.fill('')
  releaseSessions()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.equal(await page.getByText(candidate, { exact: true }).count(), 0, 'late suggestions must not reopen a dismissed menu')
  const previousSessionCalls = sessionCalls
  candidate = 'quoted paper.md'
  await composer.fill('@"quoted')
  await page.getByText(candidate, { exact: true }).waitFor()
  assert.equal(sessionCalls, previousSessionCalls, 'quoted file paths do not query sessions')
  await composer.fill('')
  await page.unroute(fileRoute)
  await page.unroute(sessionRoute)

  const paperButton = page.getByRole('button', { name: 'Paper status', exact: true })
  if (!await paperButton.isVisible()) await page.getByRole('navigation', { name: 'Global panels' }).getByRole('button', { name: 'More', exact: true }).click()
  await paperButton.click()
  await page.getByRole('heading', { name: 'A clean sheet', exact: true }).waitFor()
  await page.waitForFunction(() => document.title === 'IPaper')
  let acceptPrompt = false
  const prompts = []
  await page.route(requestUrl => requestUrl.pathname.endsWith('/prompt'), async route => {
    const body = route.request().postDataJSON()
    prompts.push(body.payload.args.request)
    await route.fulfill({ json: {
      type: 'server-response', rpcId: body.rpcId,
      result: acceptPrompt ? { ok: true, value: { accepted: true } } : { ok: false, error: { code: 'test/rejected', message: 'Browser check rejected this prompt', details: {} } },
    } })
  })
  await page.getByRole('button', { name: 'Start guided workflow', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Browser check rejected this prompt' }).waitFor()
  acceptPrompt = true
  await page.getByRole('button', { name: 'Start guided workflow', exact: true }).click()
  await composer.waitFor()
  await page.waitForFunction(() => document.title === 'Renamed browser check — IPaper')
  assert.equal(prompts.length, 2)
  for (const prompt of prompts) {
    assert.equal(prompt.sessionId, sessionId)
    assert.equal(prompt.mode, 'queue')
    assert.equal(prompt.content[0].text, '/find-the-problem')
  }
  await rpc('workspace/archiveSession', { sessionId })
  await page.waitForFunction(() => document.title === 'IPaper')
  assert.deepEqual(errors, [])
  console.log(`Browser checks passed: branding, settings persistence, platform shortcuts, navigation/focus, rename/title, reference latency/cancellation, Paper status, workflow receipts, archive. References and prompts were intercepted; no model calls. Fixture: ${workspacePath}`)
} catch (error) {
  console.error(JSON.stringify({ title: await page.title(), errors, promptRequests, snapshot: await page.locator('body').ariaSnapshot() }, null, 2))
  throw error
} finally {
  await browser.close()
}
