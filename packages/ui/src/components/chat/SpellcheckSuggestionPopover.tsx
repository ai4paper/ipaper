import React from 'react';
import { RiCheckLine, RiRefreshLine } from '@remixicon/react';
import { ScrollableOverlay } from '@/components/ui/ScrollableOverlay';
import { cn } from '@/lib/utils';

export interface SpellcheckSuggestionHandle {
  handleKeyDown: (key: string) => void;
}

type SpellcheckSuggestionPopoverProps = {
  word: string;
  suggestions: string[];
  loading: boolean;
  onSelect: (suggestion: string) => void;
  onClose: () => void;
  style?: React.CSSProperties;
};

export const SpellcheckSuggestionPopover = React.forwardRef<SpellcheckSuggestionHandle, SpellcheckSuggestionPopoverProps>(({
  word,
  suggestions,
  loading,
  onSelect,
  onClose,
  style,
}, ref) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  React.useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedIndex]);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !containerRef.current || containerRef.current.contains(target)) {
        return;
      }
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [onClose]);

  React.useImperativeHandle(ref, () => ({
    handleKeyDown: (key: string) => {
      if (key === 'Escape') {
        onClose();
        return;
      }

      const total = suggestions.length;
      if (total === 0) {
        return;
      }

      if (key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % total);
        return;
      }

      if (key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev - 1 + total) % total);
        return;
      }

      if (key === 'Enter' || key === 'Tab') {
        const safeIndex = ((selectedIndex % total) + total) % total;
        const suggestion = suggestions[safeIndex];
        if (suggestion) {
          onSelect(suggestion);
        }
      }
    },
  }), [onClose, onSelect, selectedIndex, suggestions]);

  return (
    <div
      ref={containerRef}
      className="absolute z-[100] min-w-0 w-full max-w-[360px] max-h-64 bg-background border-2 border-border/60 rounded-xl shadow-none bottom-full mb-2 left-0 flex flex-col"
      style={style}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
        <RiCheckLine className="size-4 text-[var(--status-info)]" />
        <div className="min-w-0">
          <div className="typography-ui-label font-medium truncate">Spelling suggestions</div>
          <div className="typography-meta text-muted-foreground truncate">{word}</div>
        </div>
      </div>
      <ScrollableOverlay outerClassName="flex-1 min-h-0" className="px-0 py-1">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <RiRefreshLine className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : suggestions.length > 0 ? (
          <div>
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion}-${index}`}
                ref={(el) => { itemRefs.current[index] = el; }}
                type="button"
                className={cn(
                  'block w-full text-left px-3 py-2 cursor-pointer rounded-lg typography-ui-label',
                  index === selectedIndex && 'bg-interactive-selection',
                )}
                onClick={() => onSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : (
          <div className="px-3 py-2 typography-ui-label text-muted-foreground">
            No suggestions found
          </div>
        )}
      </ScrollableOverlay>
      <div className="px-3 pt-1 pb-1.5 border-t typography-meta text-muted-foreground">
        ↑↓ navigate • Enter replace • Esc close
      </div>
    </div>
  );
});

SpellcheckSuggestionPopover.displayName = 'SpellcheckSuggestionPopover';
