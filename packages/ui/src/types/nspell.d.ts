declare module 'nspell' {
  type Spellchecker = {
    correct: (word: string) => boolean;
    suggest: (word: string) => string[];
  };

  type NSpellFactory = (aff: string, dic: string) => Spellchecker;

  const nspell: NSpellFactory;
  export default nspell;
}
