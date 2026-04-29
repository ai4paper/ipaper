import { describe, expect, test } from 'bun:test';

import { getOwningProjectPath } from './useProjectSessionLists.ts';

const session = (id, directory, extra = {}) => ({
  id,
  title: id,
  directory,
  time: { created: 1, updated: 2 },
  ...extra,
});

describe('getOwningProjectPath', () => {
  test('assigns nested project sessions to the most specific project', () => {
    const projects = [
      { normalizedPath: '/repo' },
      { normalizedPath: '/repo/packages/ui' },
    ];

    const owner = getOwningProjectPath(
      session('ses-1', '/repo/packages/ui'),
      projects,
      new Map(),
      false,
    );

    expect(owner).toBe('/repo/packages/ui');
  });

  test('prefers a child project over a parent project worktree match', () => {
    const projects = [
      { normalizedPath: '/repo' },
      { normalizedPath: '/repo/worktrees/feature-a' },
    ];
    const worktreesByProject = new Map([
      ['/repo', [{ path: '/repo/worktrees/feature-a' }]],
    ]);

    const owner = getOwningProjectPath(
      session('ses-2', '/repo/worktrees/feature-a'),
      projects,
      worktreesByProject,
      false,
    );

    expect(owner).toBe('/repo/worktrees/feature-a');
  });
});
