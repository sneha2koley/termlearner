class TermDetector {
  constructor(options = {}) {
    this._threshold = options.threshold || 3;
    this._maxContexts = options.maxContexts || 3;
    this._frequency = {};       // word -> count
    this._bigramFreq = {};      // "word1 word2" -> count
    this._contexts = {};        // word -> [sentences]
    this._nominated = new Set();
    this._knownTerms = new Set();
  }

  setKnownTerms(terms) {
    this._knownTerms = new Set(terms.map((t) => t.toLowerCase()));
  }

  addKnownTerm(word) {
    this._knownTerms.add(word.toLowerCase());
  }

  processTexts(texts) {
    const newCandidates = [];

    for (const text of texts) {
      const sentences = this._splitSentences(text);

      for (const sentence of sentences) {
        const tokens = this._tokenize(sentence);
        const filtered = tokens.filter((t) => !this._isStopword(t) && t.length > 2);

        for (const token of filtered) {
          const lower = token.toLowerCase();
          this._frequency[lower] = (this._frequency[lower] || 0) + 1;
          this._addContext(lower, sentence);

          if (this._shouldNominate(lower, token)) {
            newCandidates.push(this._buildCandidate(lower));
            this._nominated.add(lower);
          }
        }

        for (let i = 0; i < filtered.length - 1; i++) {
          const bigram = filtered[i].toLowerCase() + " " + filtered[i + 1].toLowerCase();
          this._bigramFreq[bigram] = (this._bigramFreq[bigram] || 0) + 1;
          this._addContext(bigram, sentence);

          if (this._shouldNominate(bigram, filtered[i] + " " + filtered[i + 1])) {
            newCandidates.push(this._buildCandidate(bigram));
            this._nominated.add(bigram);
          }
        }
      }
    }

    return newCandidates;
  }

  _shouldNominate(lower, original) {
    if (this._nominated.has(lower)) return false;
    if (this._knownTerms.has(lower)) return false;

    const freq = this._frequency[lower] || this._bigramFreq[lower] || 0;
    if (freq < this._threshold) return false;

    if (this._isTechnicalLooking(original)) return true;
    if (freq >= this._threshold) return true;

    return false;
  }

  _isTechnicalLooking(token) {
    if (/^[A-Z][a-z]+[A-Z]/.test(token)) return true;   // CamelCase
    if (/^[A-Z]{2,}$/.test(token)) return true;          // ACRONYM
    if (/[._\-]/.test(token)) return true;               // dotted/hyphenated
    if (/\d/.test(token) && /[a-zA-Z]/.test(token)) return true; // mixed alphanumeric
    return false;
  }

  _buildCandidate(lower) {
    return {
      word: lower,
      count: this._frequency[lower] || this._bigramFreq[lower] || 0,
      contexts: (this._contexts[lower] || []).slice(0, this._maxContexts),
    };
  }

  _addContext(lower, sentence) {
    if (!this._contexts[lower]) this._contexts[lower] = [];
    const trimmed = sentence.trim();
    if (
      trimmed.length > 10 &&
      this._contexts[lower].length < this._maxContexts &&
      !this._contexts[lower].includes(trimmed)
    ) {
      this._contexts[lower].push(trimmed);
    }
  }

  _tokenize(text) {
    return text
      .replace(/[^\w\s\-._]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  _splitSentences(text) {
    return text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
  }

  _isStopword(token) {
    return STOPWORDS.has(token.toLowerCase());
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.TermDetector = TermDetector;
}
