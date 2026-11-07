import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'

export const name = 'ipaper-brand'
export const inject = ['webServer']

export interface Config {
  /** Enable the product's dual-mode colorblind accents on the next page load. */
  colorblind?: boolean
}

export const PRODUCT_ASSETS = [
  { file: 'favicon.svg', type: 'image/svg+xml' },
  { file: 'manifest.webmanifest', type: 'application/manifest+json' },
] as const

export function productAssetPath(file: typeof PRODUCT_ASSETS[number]['file']): string {
  return fileURLToPath(new URL(`./web/${file}`, import.meta.url))
}

/** Replace document branding while preserving upstream shell and boot injections. */
export function brandIndex(html: string, config: Config = {}): string {
  if (!/<\/head\s*>/i.test(html)) throw new Error('ipaper-brand: upstream index has no closing head')
  const clean = html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>\s*/gi, '')
    .replace(/<meta\b[^>]*>\s*/gi, tag => {
      const name = /\bname\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase()
      return name === 'ipaper-colorblind' ? '' : tag
    })
    .replace(/<link\b[^>]*>\s*/gi, tag => {
      const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase().split(/\s+/)
      return rel?.some(value => ['icon', 'manifest', 'apple-touch-icon'].includes(value)) ? '' : tag
    })
  return clean.replace(/<\/head\s*>/i, `<title>IPaper</title>\n<meta name="ipaper-colorblind" content="${config.colorblind === true}">\n<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n<link rel="manifest" href="/manifest.webmanifest">\n</head>`)
}

/** Contribute product metadata through public Web hooks; upstream retains its fallback. */
export async function apply(ctx: Context, config: Config = {}): Promise<void> {
  const assets = await Promise.all(PRODUCT_ASSETS.map(async asset => ({
    ...asset,
    content: await readFile(productAssetPath(asset.file), 'utf8'),
  })))
  ctx.effect(() => ctx.webServer.tapIndex(html => brandIndex(html, config)), 'ipaper.brandIndex')
  for (const asset of assets) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path: `/${asset.file}`,
      resource: async () => new Response(asset.content, {
        headers: { 'content-type': asset.type, 'cache-control': 'no-cache' },
      }),
    }), `ipaper.brandAsset.${asset.file}`)
  }
}
