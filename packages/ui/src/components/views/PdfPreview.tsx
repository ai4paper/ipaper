import React from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { RiLoader4Line, RiZoomInLine, RiZoomOutLine } from '@remixicon/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PDF_PREVIEW_MAX_SCALE,
  PDF_PREVIEW_MIN_SCALE,
  clampPdfPreviewScale,
  stepPdfPreviewScale,
} from '@/lib/pdfPreviewScale';

if (!GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

interface PdfPreviewProps {
  src: string;
  title?: string;
  className?: string;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({ src, title = 'PDF preview', className }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [zoomScale, setZoomScale] = React.useState(1);

  const zoomPercent = Math.round(zoomScale * 100);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }

    const updateWidth = () => {
      setContainerWidth(Math.round(node.clientWidth));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node || !src) {
      return;
    }

    let cancelled = false;
    const renderTasks: Array<{ cancel: () => void }> = [];
    const loadingTask = getDocument(src);

    node.replaceChildren();
    setStatus('loading');
    setError(null);

    const renderPdf = async () => {
      try {
        const pdf = await loadingTask.promise;
        if (cancelled) {
          await pdf.destroy();
          return;
        }

        const pageCount = pdf.numPages;
        const availableWidth = Math.max(320, Math.min(containerWidth || node.clientWidth || 900, 1200));

        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
          if (cancelled) {
            break;
          }

          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const fitScale = Math.min(2, availableWidth / baseViewport.width);
          const cssScale = fitScale * zoomScale;
          const outputScale = Math.max(1, window.devicePixelRatio || 1);
          const viewport = page.getViewport({ scale: cssScale });

          const pageShell = document.createElement('div');
          pageShell.className = 'mx-auto mb-4 flex w-fit flex-col overflow-hidden rounded-md border border-border/50 bg-background shadow-sm';
          pageShell.setAttribute('aria-label', `${title} page ${pageNumber}`);

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = 'block bg-white';

          const context = canvas.getContext('2d');
          if (!context) {
            throw new Error('Canvas rendering is not available');
          }

          pageShell.appendChild(canvas);
          node.appendChild(pageShell);

          const renderTask = page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
          });
          renderTasks.push(renderTask);
          await renderTask.promise;
          page.cleanup();
        }

        if (!cancelled) {
          setStatus('ready');
        }
        await pdf.destroy();
      } catch (renderError) {
        if (!cancelled) {
          setStatus('error');
          setError(renderError instanceof Error ? renderError.message : 'Failed to render PDF');
        }
      }
    };

    void renderPdf();

    return () => {
      cancelled = true;
      renderTasks.forEach((task) => task.cancel());
      loadingTask.destroy();
      node.replaceChildren();
    };
  }, [containerWidth, src, title, zoomScale]);

  return (
    <div className={cn('relative min-h-full bg-muted/20 p-3', className)}>
      <div className="sticky top-2 z-20 mb-3 mr-auto flex w-fit items-center gap-1 rounded-lg border border-border/50 bg-background/95 p-1 shadow-sm backdrop-blur">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setZoomScale((value) => stepPdfPreviewScale(value, 'out'))}
          disabled={zoomScale <= PDF_PREVIEW_MIN_SCALE}
          className="h-7 w-7 p-0"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <RiZoomOutLine className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={() => setZoomScale(clampPdfPreviewScale(1))}
          className="h-7 min-w-12 rounded-md px-2 typography-meta text-muted-foreground hover:bg-interactive-hover hover:text-foreground"
          title="Reset zoom"
          aria-label="Reset PDF zoom"
        >
          {zoomPercent}%
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setZoomScale((value) => stepPdfPreviewScale(value, 'in'))}
          disabled={zoomScale >= PDF_PREVIEW_MAX_SCALE}
          className="h-7 w-7 p-0"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <RiZoomInLine className="h-4 w-4" />
        </Button>
      </div>
      {status === 'loading' && (
        <div className="absolute inset-x-0 top-3 z-10 mx-auto flex w-fit items-center gap-2 rounded-full border border-border/50 bg-background/95 px-3 py-1.5 typography-meta text-muted-foreground shadow-sm">
          <RiLoader4Line className="h-4 w-4 animate-spin" />
          Rendering PDF...
        </div>
      )}
      {status === 'error' && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 typography-ui text-destructive">
          {error ?? 'Failed to render PDF'}
        </div>
      )}
      <div ref={containerRef} className="mx-auto min-h-full w-full" aria-label={title} />
    </div>
  );
};
