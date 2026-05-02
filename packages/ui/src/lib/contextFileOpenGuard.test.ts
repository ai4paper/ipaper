import { describe, expect, test } from 'bun:test';

import { validateContextFileOpen } from './contextFileOpenGuard';
import type { FilesAPI } from './api/types';

describe('validateContextFileOpen', () => {
  test('allows PDF files without reading them as text', async () => {
    let readCount = 0;
    const files = {
      async readFile() {
        readCount += 1;
        return { content: Array.from({ length: 5_001 }, () => 'line').join('\n'), path: '/repo/paper.pdf' };
      },
    } as Pick<FilesAPI, 'readFile'>;

    const result = await validateContextFileOpen(files as FilesAPI, '/repo/paper.pdf');

    expect(result).toEqual({ ok: true });
    expect(readCount).toBe(0);
  });
});
