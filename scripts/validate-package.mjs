import { access, readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const target = resolve(process.argv[2] ?? 'packages/dsh-ipaper')
const root = pathToFileURL(`${target}/`)

async function filesBelow(directory, prefix = '') {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`
    if (entry.isDirectory()) files.push(...await filesBelow(new URL(`${entry.name}/`, directory), `${relative}/`))
    else if (entry.isFile()) files.push({ relative, url: new URL(entry.name, directory) })
  }
  return files
}

for (const required of [
  'package.json',
  'README.md',
  'cordis.patch.yml',
  'lib/index.js',
  'lib/types/index.d.ts',
  'lib/clients/ui-brand-ipaper/client.js',
  'lib/web/index.html',
  'lib/web/manifest.webmanifest',
  'lib/web/favicon.svg',
  'preset/ipaper/agent.cordis.yml',
]) await access(new URL(required, root))

const files = await filesBelow(root)
const forbiddenPaths = files.filter(({ relative }) =>
  relative.startsWith('src/')
  || relative.startsWith('node_modules/')
  || relative.startsWith('lib/clients/ui-conversation/')
  || relative === '.npmrc'
  || relative === 'pnpm-lock.yaml'
  || relative.endsWith('.tgz')
  || /(^|\/)\.env(?:\.|$)/.test(relative))
if (forbiddenPaths.length > 0) throw new Error(`Forbidden package paths: ${forbiddenPaths.map(item => item.relative).join(', ')}`)

for (const { relative, url } of files.filter(item => item.relative.endsWith('.js') || item.relative.endsWith('.d.ts'))) {
  const source = await readFile(url, 'utf8')
  for (const match of source.matchAll(/sourceMappingURL=([^\s*]+)/g)) {
    const map = new URL(match[1], url)
    try {
      await access(map)
    } catch {
      throw new Error(`${relative} has dangling source map reference ${match[1]}`)
    }
  }
}

const [html, manifest, readme] = await Promise.all([
  readFile(new URL('lib/web/index.html', root), 'utf8'),
  readFile(new URL('lib/web/manifest.webmanifest', root), 'utf8'),
  readFile(new URL('README.md', root), 'utf8'),
])
if (!html.includes('<title>IPaper</title>')) throw new Error('Packed Web title is not IPaper')
if (JSON.parse(manifest).name !== 'IPaper') throw new Error('Packed Web manifest is not IPaper')
if (/iKanban|DeepSeek Harness|kanban/i.test(`${html}\n${manifest}`)) throw new Error('Packed Web metadata leaks another product brand')
if (!readme.includes('@isomoes/dsh-web-ui@0.5.1')) throw new Error('Packed README omits the exact shared dependency')

console.log(`Validated ${files.length} packed files in ${target}`)
