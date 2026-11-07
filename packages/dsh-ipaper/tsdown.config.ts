import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

const id = '@ai4paper/dsh-ipaper'
const externals = new Set(['react', 'react-dom', 'react/jsx-runtime'])

export default defineConfig({
  name: `${id}/client`,
  entry: { client: resolve(import.meta.dirname, 'client/index.ts') },
  outDir: resolve(import.meta.dirname, 'lib'),
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
