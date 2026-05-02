import dictionaryAffUrl from '../../../node_modules/dictionary-en/index.aff?url';
import dictionaryDicUrl from '../../../node_modules/dictionary-en/index.dic?url';

export type SpellcheckWordRange = {
  word: string;
  start: number;
  end: number;
};

type NSpellInstance = {
  correct: (word: string) => boolean;
  suggest: (word: string) => string[];
};

type NSpellFactory = (aff: string, dic: string) => NSpellInstance;

const WORD_RE = /[A-Za-z][A-Za-z'-]*/g;

let spellcheckerPromise: Promise<NSpellInstance> | null = null;

const loadSpellchecker = async (): Promise<NSpellInstance> => {
  if (!spellcheckerPromise) {
    spellcheckerPromise = Promise.all([import('nspell'), fetch(dictionaryAffUrl), fetch(dictionaryDicUrl)])
      .then(async ([nspellModule, affResponse, dicResponse]) => {
      if (!affResponse.ok || !dicResponse.ok) {
        throw new Error('Failed to load spelling dictionary');
      }

      const createSpellchecker = nspellModule.default as NSpellFactory;
      return createSpellchecker(await affResponse.text(), await dicResponse.text());
    });
  }

  return spellcheckerPromise;
};

export const getSpellcheckWordAtPosition = (text: string, position: number): SpellcheckWordRange | null => {
  const cursor = Math.max(0, Math.min(position, text.length));
  let match: RegExpExecArray | null;

  WORD_RE.lastIndex = 0;
  while ((match = WORD_RE.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (cursor >= start && cursor <= end) {
      return { word: match[0], start, end };
    }
  }

  return null;
};

const matchOriginalCase = (original: string, suggestion: string): string => {
  if (original.toUpperCase() === original) {
    return suggestion.toUpperCase();
  }

  if (original[0] && original[0].toUpperCase() === original[0]) {
    return `${suggestion[0]?.toUpperCase() ?? ''}${suggestion.slice(1)}`;
  }

  return suggestion;
};

export const applySpellingSuggestion = (
  text: string,
  range: SpellcheckWordRange,
  suggestion: string,
): { text: string; cursor: number } => {
  const replacement = matchOriginalCase(range.word, suggestion);
  const nextText = `${text.slice(0, range.start)}${replacement}${text.slice(range.end)}`;
  return {
    text: nextText,
    cursor: range.start + replacement.length,
  };
};

export const getSpellingSuggestions = async (word: string, limit = 6): Promise<string[]> => {
  const trimmed = word.trim();
  if (!trimmed) {
    return [];
  }

  const spellchecker = await loadSpellchecker();
  if (spellchecker.correct(trimmed)) {
    return [];
  }

  return spellchecker.suggest(trimmed).slice(0, limit);
};
