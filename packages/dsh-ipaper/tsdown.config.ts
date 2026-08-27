import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

interface ClientBuild {
  readonly name: string
  readonly entry: string
  readonly inject: readonly string[]
}

const clients: readonly ClientBuild[] = [
  {
    name: 'ui-brand-ipaper',
    entry: 'client/ui-brand-ipaper/client/index.ts',
    inject: [
      '@deepseek-ai/dsh-client-runtime',
      '@isomoes/dsh-web-ui/client/ui-conversation',
      '@isomoes/dsh-web-ui/client/ui-sidebar',
    ],
  },
  {
    name: 'ui-paper-project',
    entry: 'client/ui-paper-project/client/index.tsx',
    inject: [
      '@deepseek-ai/dsh-client-connection',
      '@deepseek-ai/dsh-client-runtime',
      '@isomoes/dsh-web-ui/client/ui-commands',
      '@isomoes/dsh-web-ui/client/ui-conversation',
      '@isomoes/dsh-web-ui/client/ui-sidebar',
    ],
  },
]

const externals = new Set(['react', 'react-dom', 'react/jsx-runtime'])

export default defineConfig(clients.map(client => {
  const id = `@ai4paper/dsh-ipaper/client/${client.name}`
  const outDir = resolve(import.meta.dirname, `lib/clients/${client.name}`)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, 'index.js'), 'export function apply() {}\n')
  writeFileSync(resolve(outDir, 'package.json'), `${JSON.stringify({
    name: id,
    type: 'module',
    exports: { '.': './index.js', './client': './client.js', './package.json': './package.json' },
    dsh: {
      client: {
        inject: client.inject,
        platform: 'web',
      },
    },
  }, null, 2)}\n`)

  return {
    name: `${id}/client`,
    entry: { client: resolve(import.meta.dirname, client.entry) },
    outDir,
    format: 'cjs' as const,
    platform: 'browser' as const,
    target: 'es2024' as const,
    dts: false,
    sourcemap: false,
    clean: false,
    deps: {
      neverBundle: (specifier: string) => externals.has(specifier),
      alwaysBundle: (specifier: string) => !externals.has(specifier),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  }
}))
