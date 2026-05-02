import { describe, expect, test } from 'bun:test';

import { clampPdfPreviewScale, stepPdfPreviewScale } from './pdfPreviewScale';

describe('pdfPreviewScale', () => {
  test('clamps zoom scale to the supported range', () => {
    expect(clampPdfPreviewScale(0.1)).toBe(0.5);
    expect(clampPdfPreviewScale(3)).toBe(2);
    expect(clampPdfPreviewScale(Number.NaN)).toBe(1);
  });

  test('steps zoom scale in fixed increments', () => {
    expect(stepPdfPreviewScale(1, 'in')).toBe(1.25);
    expect(stepPdfPreviewScale(1, 'out')).toBe(0.75);
    expect(stepPdfPreviewScale(2, 'in')).toBe(2);
    expect(stepPdfPreviewScale(0.5, 'out')).toBe(0.5);
  });
});
