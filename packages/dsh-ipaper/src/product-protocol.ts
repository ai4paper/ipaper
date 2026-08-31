import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { IPAPER_PRODUCT_PROTOCOL } from './paper-project/instructions.js'

export { IPAPER_PRODUCT_PROTOCOL } from './paper-project/instructions.js'

export const IPAPER_PROTOCOL_SECTION = 'ipaper:paper-project-protocol'
export const IPAPER_PROTOCOL_ORDER = 10

export const name = 'product-protocol'
export const inject = ['systemPrompt']

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.systemPrompt.section({
    name: IPAPER_PROTOCOL_SECTION,
    order: IPAPER_PROTOCOL_ORDER,
    text: IPAPER_PRODUCT_PROTOCOL,
  }), 'ipaper.productProtocolSection()')
}
