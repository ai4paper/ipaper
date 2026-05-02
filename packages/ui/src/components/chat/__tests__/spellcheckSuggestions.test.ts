import { describe, expect, test } from 'bun:test';
import { applySpellingSuggestion, getSpellcheckWordAtPosition } from '../spellcheckSuggestions';

describe('getSpellcheckWordAtPosition', () => {
  test('returns the word under the cursor', () => {
    expect(getSpellcheckWordAtPosition('fix teh sentence', 5)).toEqual({
      word: 'teh',
      start: 4,
      end: 7,
    });
  });

  test('returns null when the cursor is not on a word', () => {
    expect(getSpellcheckWordAtPosition('fix  teh sentence', 4)).toBeNull();
  });
});

describe('applySpellingSuggestion', () => {
  test('replaces the selected word and returns the next cursor', () => {
    expect(applySpellingSuggestion('fix teh sentence', { word: 'teh', start: 4, end: 7 }, 'the')).toEqual({
      text: 'fix the sentence',
      cursor: 7,
    });
  });

  test('preserves initial capitalization', () => {
    expect(applySpellingSuggestion('Teh sentence', { word: 'Teh', start: 0, end: 3 }, 'the')).toEqual({
      text: 'The sentence',
      cursor: 3,
    });
  });
});
