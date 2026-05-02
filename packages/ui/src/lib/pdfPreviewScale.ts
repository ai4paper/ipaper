export const PDF_PREVIEW_MIN_SCALE = 0.5;
export const PDF_PREVIEW_MAX_SCALE = 2;
export const PDF_PREVIEW_SCALE_STEP = 0.25;

export const clampPdfPreviewScale = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(PDF_PREVIEW_MAX_SCALE, Math.max(PDF_PREVIEW_MIN_SCALE, value));
};

export const stepPdfPreviewScale = (value: number, direction: 'in' | 'out'): number => {
  const delta = direction === 'in' ? PDF_PREVIEW_SCALE_STEP : -PDF_PREVIEW_SCALE_STEP;
  return clampPdfPreviewScale(Number((value + delta).toFixed(2)));
};
