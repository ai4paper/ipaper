import type { HeroBrandMarkOwnerProps } from '@isomoes/dsh-web-ui/client/ui-conversation/client'
import type { SidebarBrandMarkOwnerProps } from '@isomoes/dsh-web-ui/client/ui-sidebar/client'
import { useLayoutEffect, useRef } from 'react'
import manifest from '../../../package.json' with { type: 'json' }

const IPAPER_VERSION = manifest.version

type IPaperBrandMarkProps = HeroBrandMarkOwnerProps & SidebarBrandMarkOwnerProps

/** A compact paper-and-pen mark for IPaper. */
export function IPaperBrandMark({ size = 24, className }: IPaperBrandMarkProps) {
  const brandMark = useRef<SVGSVGElement>(null)

  useLayoutEffect(() => {
    const slot = brandMark.current?.closest('[data-slot="conversation.hero.brand.mark"]')
    const headline = slot?.parentElement?.nextElementSibling
    const versionBadge = headline?.nextElementSibling
    if (headline instanceof HTMLElement) headline.textContent = 'IPaper'
    if (versionBadge instanceof HTMLElement) versionBadge.textContent = `v${IPAPER_VERSION}`
  }, [])

  return (
    <svg ref={brandMark} width={size} height={size} className={className} viewBox="0 0 512 512" fill="none" aria-hidden="true">
      <rect width="512" height="512" rx="116" fill="#17324D" />
      <path d="M132 88h174l74 74v246c0 8.8-7.2 16-16 16H148c-8.8 0-16-7.2-16-16V88Z" fill="#FBF8F0" />
      <path d="M306 88v58c0 8.8 7.2 16 16 16h58" fill="#C9D6E2" />
      <path d="M180 214h140M180 264h108M180 314h72" stroke="#6F91AD" strokeWidth="22" strokeLinecap="round" />
      <path d="m278 376 96-96 42 42-96 96-58 16 16-58Z" fill="#E0A64B" />
      <path d="m374 280 16-16c6.6-6.6 17.4-6.6 24 0l18 18c6.6 6.6 6.6 17.4 0 24l-16 16-42-42Z" fill="#F1C46E" />
      <path d="m262 434 16-58 42 42-58 16Z" fill="#FBF8F0" />
      <path d="m262 434 9-31 22 22-31 9Z" fill="#17324D" />
    </svg>
  )
}

export function IPaperBrandName() {
  const brandName = useRef<SVGSVGElement>(null)

  useLayoutEffect(() => {
    const slot = brandName.current?.closest('[data-slot="sidebar.brand.name"]')
    const versionBadge = slot?.parentElement?.nextElementSibling
    if (versionBadge instanceof HTMLElement) versionBadge.textContent = `v${IPAPER_VERSION}`
  }, [])

  return (
    <svg ref={brandName} width="72" height="24" viewBox="0 0 72 24" fill="none" aria-label="IPaper">
      <text x="0" y="17.5" fill="currentColor" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" fontSize="17" fontWeight="650" letterSpacing="-0.4">IPaper</text>
    </svg>
  )
}
