import { createRequire } from 'node:module'

const require = createRequire(new URL('../packages/dsh-ipaper/package.json', import.meta.url))
const { parseDocument } = require('yaml')

/** pnpm 11 profile policy: upstream runtime identity and APaper's DSH adapter compatibility. */
export const profileSettings = `packages:
  - .
nodeLinker: hoisted
autoInstallPeers: true
overrides:
  '@ai4paper/apaper-plugin@0.2.3>@deepseek-ai/dsh-mcp-client': 0.2.2-rc.1
allowBuilds:
  '@deepseek-ai/dsh-subprocess-local': true
  node-pty: true
  '@google/genai': false
  esbuild: true
  koffi: true
  protobufjs: false
`

/** Merge managed policy keys while retaining extension settings and YAML comments. */
export function mergeProfileSettings(source = '') {
  const document = parseDocument(source)
  if (document.errors.length) throw new Error(`Invalid profile settings: ${document.errors[0].message}`)
  const required = parseDocument(profileSettings).toJS()
  const current = document.toJS() ?? {}
  if (typeof current !== 'object' || Array.isArray(current)) throw new Error('Profile settings must be a YAML mapping')
  const packages = current.packages ?? []
  if (!Array.isArray(packages)) throw new Error('Profile packages must be an array')
  if (!packages.includes('.')) document.set('packages', ['.', ...packages])
  for (const key of ['nodeLinker', 'autoInstallPeers']) document.set(key, required[key])
  for (const key of ['overrides', 'allowBuilds']) {
    for (const [name, value] of Object.entries(required[key])) document.setIn([key, name], value)
  }
  return document.toString()
}

/** Put managed layers first; retain every separately installed extension. */
export function migrateDevManifest(manifest) {
  const managed = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@ai4paper/dsh-ipaper']
  const retired = '@isomoes/dsh-web-ui'
  const bundles = manifest.dsh?.profile?.bundles ?? []
  if (!Array.isArray(bundles)) throw new Error('Profile bundles must be an array')
  return {
    ...manifest,
    dependencies: Object.fromEntries(Object.entries(manifest.dependencies ?? {}).filter(([name]) => name !== retired)),
    dsh: {
      ...manifest.dsh,
      profile: {
        ...manifest.dsh?.profile,
        bundles: [...managed, ...bundles.filter(name => !managed.includes(name) && name !== retired)],
      },
    },
  }
}
