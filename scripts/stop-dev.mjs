#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

if (process.platform === 'win32') {
  console.error('[stop] Windows is not supported by this helper yet.');
  process.exit(1);
}

const patterns = [
  `${repoRoot}/scripts/dev-web-full.mjs`,
  `${repoRoot}/scripts/dev-web-hmr.mjs`,
  'bun run --cwd packages/web dev:server:watch',
  'bun run --cwd packages/web build:watch',
  'nodemon --watch server --ext js --exec bun server/index.js --port',
  'bun server/index.js --port',
  'vite build --watch',
  'bun x vite --force --host 127.0.0.1 --port',
];

const matched = new Map();

for (const pattern of patterns) {
  const result = spawnSync('pgrep', ['-af', pattern], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 5000,
  });

  const output = result.stdout || '';
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const spaceIndex = trimmed.indexOf(' ');
    const pidText = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
    const command = spaceIndex === -1 ? '' : trimmed.slice(spaceIndex + 1);
    const pid = Number.parseInt(pidText, 10);

    if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) {
      continue;
    }

    matched.set(pid, command);
  }
}

if (matched.size === 0) {
  console.log('[stop] No matching dev processes found.');
  process.exit(0);
}

const terminate = (signal) => {
  for (const pid of matched.keys()) {
    try {
      process.kill(pid, signal);
    } catch {
    }
  }
};

console.log(`[stop] Stopping ${matched.size} dev process${matched.size === 1 ? '' : 'es'}...`);
for (const [pid, command] of matched) {
  console.log(`[stop] ${pid} ${command}`);
}

terminate('SIGINT');
await new Promise((resolve) => setTimeout(resolve, 1500));
terminate('SIGTERM');
await new Promise((resolve) => setTimeout(resolve, 1500));
terminate('SIGKILL');

console.log('[stop] Stop signals sent.');
