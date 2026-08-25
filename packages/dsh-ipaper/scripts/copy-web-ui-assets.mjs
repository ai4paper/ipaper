import { cp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const sharedIndexUrl = import.meta.resolve('@isomoes/dsh-web-ui/web/index.html')
const sharedWebRoot = pathToFileURL(`${dirname(fileURLToPath(sharedIndexUrl))}/`)
const destination = new URL('../lib/web/', import.meta.url)
const productBrand = new URL('../web-brand/', import.meta.url)

await rm(destination, { recursive: true, force: true })
await cp(sharedWebRoot, destination, { recursive: true, force: true })

const indexUrl = new URL('index.html', destination)
const sharedIndex = await readFile(indexUrl, 'utf8')
const title = '<title>DeepSeek Harness</title>'
if (!sharedIndex.includes(title)) {
  throw new Error(`Shared Web UI index no longer contains the expected neutral title marker: ${title}`)
}
await writeFile(indexUrl, sharedIndex.replace(title, '<title>IPaper</title>'))
await cp(new URL('manifest.webmanifest', productBrand), new URL('manifest.webmanifest', destination), { force: true })
await cp(new URL('favicon.svg', productBrand), new URL('favicon.svg', destination), { force: true })

// @isomoes/dsh-web-ui@0.5.1 excludes source maps but leaves map comments in
// its release assets. IPaper consistently ships without maps, so remove only
// those debugging directives from the copied JavaScript.
async function stripSourceMapDirectives(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name, directory)
    if (entry.isDirectory()) {
      await stripSourceMapDirectives(new URL(`${entry.name}/`, directory))
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const source = await readFile(url, 'utf8')
      const clean = source
        .replace(/^\s*\/\/[#@]\s*sourceMappingURL=.*$/gm, '')
        .replace(/\/\*[#@]\s*sourceMappingURL=.*?\*\//gs, '')
      if (clean !== source) await writeFile(url, clean)
    }
  }
}
await stripSourceMapDirectives(destination)
