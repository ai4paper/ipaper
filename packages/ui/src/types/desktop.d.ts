import type { DesktopBootOutcome } from '@/lib/desktopBoot';

declare global {
  interface Window {
    __IPAPER_HOME__?: string;
    __IPAPER_MACOS_MAJOR__?: number;
    __IPAPER_LOCAL_ORIGIN__?: string;
    __IPAPER_DESKTOP_BOOT_OUTCOME__?: DesktopBootOutcome;
  }
}

export {};
