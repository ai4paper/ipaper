import { describe, expect, test } from 'bun:test';

import { isPdfFile } from './toolHelpers';

describe('isPdfFile', () => {
  test('detects PDF files case-insensitively', () => {
    expect(isPdfFile('/tmp/paper.pdf')).toBe(true);
    expect(isPdfFile('/tmp/PAPER.PDF')).toBe(true);
    expect(isPdfFile('/tmp/paper.txt')).toBe(false);
  });
});
