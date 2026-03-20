/**
 * Tokenizer Architecture
 * 
 * Defines the pluggable interface for text segmentation engines (Intl.Segmenter, MeCab, Yomitan, etc).
 */

export interface Token {
  text: string;
  isWordLike: boolean; // True if semantic word, False if punctuation/whitespace
  index: number;
}

export interface Tokenizer {
  /**
   * Parses a raw string into an array of semantic tokens
   */
  tokenize(text: string): Token[];
}

/**
 * Default built-in Tokenizer using the browser's Intl.Segmenter API
 * Very fast, no external dependencies, but less accurate than MeCab for complex grammar.
 */
export class IntlSegmenterTokenizer implements Tokenizer {
  private segmenter: Intl.Segmenter;

  constructor(locale: string = 'ja') {
    // We default to Japanese 'word' granularity as the primary use case
    // @ts-ignore
    this.segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  }

  tokenize(text: string): Token[] {
    if (!text) return [];

    const segments = this.segmenter.segment(text);
    const tokens: Token[] = [];
    let i = 0;

    for (const segmentData of segments) {
      tokens.push({
        text: segmentData.segment,
        isWordLike: segmentData.isWordLike || false,
        index: i++
      });
    }

    return tokens;
  }
}

/**
 * Singleton factory/registry for getting the active tokenizer
 */
class TokenizerFactory {
  private activeTokenizer: Tokenizer;

  constructor() {
    // Default to Intl
    this.activeTokenizer = new IntlSegmenterTokenizer('ja');
  }

  getTokenizer(): Tokenizer {
    return this.activeTokenizer;
  }

  /**
   * In the future, this can be used to swap to a MeCabTokenizer or YomitanTokenizer
   */
  setActiveTokenizer(tokenizer: Tokenizer) {
    this.activeTokenizer = tokenizer;
  }
}

export const tokenizers = new TokenizerFactory();
