import { describe, expect, test } from 'bun:test';
import { opencodeClient } from '@/lib/opencode/client';
import { useConfigStore } from './useConfigStore';

const createLocalStorage = () => {
  const values = new Map<string, string>();
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
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage,
      setTimeout,
      clearTimeout,
    },
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorage,
    configurable: true,
  });
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('useConfigStore default settings', () => {
  test('does not persistently clear a temporarily unavailable default model', async () => {
    installBrowserStubs();
    const originalFetch = globalThis.fetch;
    const originalWithDirectory = opencodeClient.withDirectory;
    const originalListAgents = opencodeClient.listAgents;
    const requests: Array<{ method: string; url: string; body?: string }> = [];

    try {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        requests.push({ method, url, body: typeof init?.body === 'string' ? init.body : undefined });

        if (url === '/api/config/settings') {
          return new Response(JSON.stringify({ defaultModel: 'missing/model' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response('{}', { status: 200 });
      }) as typeof fetch;

      opencodeClient.withDirectory = async (_directory, callback) => callback();
      opencodeClient.listAgents = async () => [
        { name: 'build', mode: 'primary' },
      ] as Awaited<ReturnType<typeof opencodeClient.listAgents>>;

      useConfigStore.setState({
        activeDirectoryKey: undefined,
        providers: [{ id: 'opencode', name: 'opencode', models: [{ id: 'big-pickle', name: 'big-pickle' }] }] as any,
        agents: [],
        settingsDefaultModel: undefined,
      });

      await useConfigStore.getState().loadAgents();
      await wait(300);

      expect(useConfigStore.getState().settingsDefaultModel).toBe('missing/model');
      expect(requests.some((request) => request.method === 'PUT' && request.url === '/api/config/settings')).toBe(false);
    } finally {
      opencodeClient.withDirectory = originalWithDirectory;
      opencodeClient.listAgents = originalListAgents;
      if (originalFetch) {
        globalThis.fetch = originalFetch;
      } else {
        Reflect.deleteProperty(globalThis, 'fetch');
      }
      Reflect.deleteProperty(globalThis, 'window');
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });
});
