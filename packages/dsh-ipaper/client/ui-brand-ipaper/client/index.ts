/** IPaper occupants for the product-neutral browser branding slots. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { IPaperBrandMark, IPaperBrandName } from './Brand.tsx'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import { COLORBLIND_TOKENS } from './colorblind.ts'

export const inject = ['slots', 'theme']

export interface Config {
  /** Use a blue/orange status palette while retaining upstream light/dark/system preferences. */
  colorblind?: boolean
}

export function apply(ctx: ClientContext, config: Config = {}): void {
  if (config.colorblind === true) {
    ctx.effect(() => ctx.theme.overrideTokens('@ai4paper/dsh-ipaper', COLORBLIND_TOKENS), 'ipaper.colorblind')
  }
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.register({ name: 'sidebar.brand.mark' }, IPaperBrandMark))
  ctx.slots.inject('sidebar.brand.name', () =>
    ctx.slots.register({ name: 'sidebar.brand.name' }, IPaperBrandName))
  ctx.slots.inject('conversation.hero.brand.mark', () =>
    ctx.slots.register({ name: 'conversation.hero.brand.mark' }, IPaperBrandMark))
}
