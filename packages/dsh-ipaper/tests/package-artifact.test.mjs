import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'

const root = new URL('../', import.meta.url)

async function filesBelow(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name, directory)
    if (entry.isDirectory()) files.push(...await filesBelow(new URL(`${entry.name}/`, directory)))
    else if (entry.isFile()) files.push(url)
  }
  return files
}

test('shipped browser metadata is locally owned IPaper branding', async () => {
  const [html, manifest, favicon, sourceManifest, sourceFavicon] = await Promise.all([
    readFile(new URL('lib/web/index.html', root), 'utf8'),
    readFile(new URL('lib/web/manifest.webmanifest', root), 'utf8'),
    readFile(new URL('lib/web/favicon.svg', root), 'utf8'),
    readFile(new URL('web-brand/manifest.webmanifest', root), 'utf8'),
    readFile(new URL('web-brand/favicon.svg', root), 'utf8'),
  ])
  assert.match(html, /<title>IPaper<\/title>/)
  assert.equal(manifest, sourceManifest)
  assert.equal(favicon, sourceFavicon)
  assert.equal(JSON.parse(manifest).name, 'IPaper')
  assert.doesNotMatch(`${html}\n${manifest}`, /iKanban|DeepSeek Harness|kanban/i)
})

test('every shipped JavaScript and declaration source-map reference resolves', async () => {
  const files = await filesBelow(new URL('lib/', root))
  const inspected = files.filter(url => url.pathname.endsWith('.js') || url.pathname.endsWith('.d.ts'))
  assert.ok(inspected.length > 0)
  for (const url of inspected) {
    const source = await readFile(url, 'utf8')
    for (const match of source.matchAll(/sourceMappingURL=([^\s*]+)/g)) {
      const map = new URL(match[1], url)
      await assert.doesNotReject(readFile(map), `${url.pathname} references missing ${map.pathname}`)
    }
  }
})
