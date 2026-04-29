import { describe, expect, test } from 'bun:test';

type StoredValue = string;

const createLocalStorage = () => {
  const values = new Map<string, StoredValue>();
  return {
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    setItem(key: string, value: string) {
      values.set(key, String(value));
    },
    removeItem(key: string) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
};

const installBrowserStubs = () => {
  const localStorage = createLocalStorage();
  const listeners = new Map<string, Array<(event: Event) => void>>();
  const windowStub = {
    localStorage,
    dispatchEvent(event: Event) {
      const handlers = listeners.get(event.type) ?? [];
      handlers.forEach((handler) => handler(event));
      return true;
    },
    addEventListener(type: string, handler: (event: Event) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), handler]);
    },
    removeEventListener(type: string, handler: (event: Event) => void) {
      listeners.set(type, (listeners.get(type) ?? []).filter((candidate) => candidate !== handler));
    },
  };

  Object.defineProperty(globalThis, 'window', {
    value: windowStub,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorage,
    configurable: true,
  });
};

describe('syncDesktopSettings', () => {
  test('restores current theme mode from persisted server settings', async () => {
    installBrowserStubs();
    try {
      globalThis.fetch = Object.assign(
        async () => new Response(JSON.stringify({
          useSystemTheme: false,
          themeVariant: 'dark',
          lightThemeId: 'flexoki-light',
          darkThemeId: 'catppuccin-mocha',
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
        { preconnect() {} },
      ) as typeof fetch;

      const { syncDesktopSettings } = await import('./persistence');

      await syncDesktopSettings();

      expect(localStorage.getItem('themeMode')).toBe('dark');
      expect(localStorage.getItem('useSystemTheme')).toBe('false');
      expect(localStorage.getItem('darkThemeId')).toBe('catppuccin-mocha');
    } finally {
      Reflect.deleteProperty(globalThis, 'window');
      Reflect.deleteProperty(globalThis, 'localStorage');
      Reflect.deleteProperty(globalThis, 'fetch');
    }
  });
});
