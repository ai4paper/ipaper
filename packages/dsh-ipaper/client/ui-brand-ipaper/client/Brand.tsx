import type { HeroBrandMarkOwnerProps } from '@isomoes/dsh-web-ui/client/ui-conversation/client'
import type { SidebarBrandMarkOwnerProps } from '@isomoes/dsh-web-ui/client/ui-sidebar/client'

type IPaperBrandMarkProps = HeroBrandMarkOwnerProps & SidebarBrandMarkOwnerProps

/** A compact paper-and-pen mark for IPaper. */
export function IPaperBrandMark({ size = 24, className }: IPaperBrandMarkProps) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 512 512" fill="none" aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#17324D" />
      <path d="M132 92h190l58 58v270H132V92Z" fill="#F8FAFC" />
      <path d="M322 92v66h58" fill="#C9D6E2" />
      <path d="M184 220h144M184 268h112M184 316h80" stroke="#7090AD" strokeWidth="24" strokeLinecap="round" />
      <path d="m278 362 102-102 34 34-102 102-52 18 18-52Z" fill="#D59B45" />
    </svg>
  )
}

export function IPaperBrandName() {
  return (
    <svg width="72" height="24" viewBox="0 0 72 24" fill="none" aria-label="IPaper">
      <text x="0" y="17.5" fill="currentColor" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" fontSize="17" fontWeight="650" letterSpacing="-0.4">IPaper</text>
    </svg>
  )
}
