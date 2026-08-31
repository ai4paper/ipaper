import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

const id = '@ai4paper/dsh-ipaper/client/ui-brand-ipaper'
const outDir = resolve(import.meta.dirname, 'lib/clients/ui-brand-ipaper')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'index.js'), 'export function apply() {}\n')
writeFileSync(resolve(outDir, 'package.json'), `${JSON.stringify({
  name: id,
  type: 'module',
  exports: { '.': './index.js', './client': './client.js', './package.json': './package.json' },
  dsh: {
    client: {
      inject: [
        '@deepseek-ai/dsh-client-runtime',
        '@isomoes/dsh-web-ui/client/ui-conversation',
        '@isomoes/dsh-web-ui/client/ui-sidebar',
      ],
      platform: 'web',
    },
  },
}, null, 2)}\n`)

const externals = new Set(['react', 'react/jsx-runtime'])
export default defineConfig({
  name: `${id}/client`,
  entry: { client: resolve(import.meta.dirname, 'client/ui-brand-ipaper/client/index.ts') },
  outDir,
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
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
})
