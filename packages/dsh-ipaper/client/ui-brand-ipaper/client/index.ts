/** IPaper occupants for the product-neutral browser branding slots. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@isomoes/dsh-web-ui/client/ui-conversation/client'
import type {} from '@isomoes/dsh-web-ui/client/ui-sidebar/client'
import { IPaperBrandMark, IPaperBrandName } from './Brand.tsx'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', () =>
      ctx.slots.inject('conversation.hero.brand.mark', function* () {
        yield ctx.slots.register({ name: 'sidebar.brand.mark' }, IPaperBrandMark)
        yield ctx.slots.register({ name: 'sidebar.brand.name' }, IPaperBrandName)
        yield ctx.slots.register({ name: 'conversation.hero.brand.mark' }, IPaperBrandMark)
      })))
}
