import { describe, expect, test } from 'bun:test';

import { getRawFileMimeType } from './routes.js';

describe('getRawFileMimeType', () => {
  test('serves PDFs as application/pdf for browser preview', () => {
    expect(getRawFileMimeType('/repo/paper.pdf')).toBe('application/pdf');
    expect(getRawFileMimeType('/repo/PAPER.PDF')).toBe('application/pdf');
  });
});
