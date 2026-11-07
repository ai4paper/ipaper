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
  'lib/paper-project/index.js',
  'lib/paper-project/tools.js',
  'lib/types/paper-project/index.d.ts',
  'lib/types/paper-project/tools.d.ts',
  'lib/product-protocol.js',
  'lib/types/product-protocol.d.ts',
  'lib/ipaper-skills.js',
  'lib/types/ipaper-skills.d.ts',
  'lib/client.js',
  'lib/web/manifest.webmanifest',
  'lib/web/favicon.svg',
  'preset/ipaper/agent.cordis.yml',
  'skills/find-the-problem/SKILL.md',
]) await access(new URL(required, root))

const files = await filesBelow(root)
const forbiddenPaths = files.filter(({ relative }) =>
  relative.startsWith('src/')
  || relative.startsWith('node_modules/')
  || relative.startsWith('lib/clients/ui-conversation/')
  || (relative.startsWith('lib/web/') && !['lib/web/manifest.webmanifest', 'lib/web/favicon.svg'].includes(relative))
  || relative === '.npmrc'
  || relative === 'pnpm-lock.yaml'
  || relative.endsWith('.tgz')
  || /(^|\/)\.env(?:\.|$)/.test(relative))
if (forbiddenPaths.length > 0) throw new Error(`Forbidden package paths: ${forbiddenPaths.map(item => item.relative).join(', ')}`)

for (const { relative, url } of files.filter(item => item.relative.endsWith('.js') || item.relative.endsWith('.d.ts'))) {
  const source = await readFile(url, 'utf8')
  if (source.includes('@isomoes/dsh-web-ui')) throw new Error(`${relative} retains the retired Web fork`)
  for (const match of source.matchAll(/sourceMappingURL=([^\s*]+)/g)) {
    const map = new URL(match[1], url)
    try {
      await access(map)
    } catch {
      throw new Error(`${relative} has dangling source map reference ${match[1]}`)
    }
  }
}

const [manifest, readme, agentComposition, findProblemSkill] = await Promise.all([
  readFile(new URL('lib/web/manifest.webmanifest', root), 'utf8'),
  readFile(new URL('README.md', root), 'utf8'),
  readFile(new URL('preset/ipaper/agent.cordis.yml', root), 'utf8'),
  readFile(new URL('skills/find-the-problem/SKILL.md', root), 'utf8'),
])
if (JSON.parse(manifest).name !== 'IPaper') throw new Error('Packed Web manifest is not IPaper')
if (/iKanban|DeepSeek Harness|kanban/i.test(manifest)) throw new Error('Packed Web metadata leaks another product brand')
if (!readme.includes('@deepseek-ai/dsh-web-app@0.2.2-rc.1')) throw new Error('Packed README omits the exact upstream Web dependency')
const packageManifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
if (JSON.stringify(packageManifest).includes('@isomoes/dsh-web-ui')) throw new Error('Packed manifest retains the retired Web fork')
for (const entry of Object.values(packageManifest.exports)) {
  for (const file of typeof entry === 'string' ? [entry] : Object.values(entry)) {
    if (!file.includes('*')) await access(new URL(file, root))
  }
}
if (!/- id: apaper-plugin\s+name: '@ai4paper\/apaper-plugin\/dsh'/.test(agentComposition)) {
  throw new Error('Packed IPaper preset omits the APaper DSH plugin')
}
if (!/- id: ipaper-skills\s+name: '@ai4paper\/dsh-ipaper\/ipaper-skills'/.test(agentComposition)) {
  throw new Error('Packed IPaper preset omits the IPaper skills registry')
}
if (!/^---\n[\s\S]*name: find-the-problem[\s\S]*user-invocable: true[\s\S]*\n---\n/.test(findProblemSkill)) {
  throw new Error('Packed Find the Problem skill has invalid invocation frontmatter')
}
if (!/apaper-mcp/i.test(findProblemSkill) || !/interest, novelty, and feasibility/i.test(findProblemSkill)) {
  throw new Error('Packed Find the Problem skill omits its research workflow')
}
if (!/- id: paper-project-tools\s+name: '@ai4paper\/dsh-ipaper\/paper-project-tools'/.test(agentComposition)) {
  throw new Error('Packed IPaper preset omits the Paper Project tools')
}
if (!/- id: product-protocol\s+name: '@ai4paper\/dsh-ipaper\/product-protocol'/.test(agentComposition)) {
  throw new Error('Packed IPaper preset omits the Paper Project system-prompt protocol')
}

console.log(`Validated ${files.length} packed files in ${target}`)
