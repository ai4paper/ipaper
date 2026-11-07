/** One package-root browser half, discovered by upstream Client Modules. */
import type { Context } from '@deepseek-ai/cordis'
import { apply as applyBrand, type Config } from './ui-brand-ipaper/client/index.ts'
import { apply as applyPaperProject } from './ui-paper-project/client/index.tsx'
import { apply as applyTitle } from './title.ts'

export const inject = ['slots', 'theme', 'sessions', 'workspaces', 'connection', 'layout']

export function apply(ctx: Context, config: Config = {}): void {
  const colorblind = config.colorblind ?? (typeof document !== 'undefined'
    && document.head.querySelector('meta[name="ipaper-colorblind"]')?.getAttribute('content') === 'true')
  applyBrand(ctx, { colorblind })
  applyPaperProject(ctx)
  applyTitle(ctx)
}
