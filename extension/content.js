(function termLearnerContent() {
  "use strict";

  const LOG_PREFIX = "[TermLearner]";
  function log(...args) { console.log(LOG_PREFIX, ...args); }
  function warn(...args) { console.warn(LOG_PREFIX, ...args); }
  function err(...args) { console.error(LOG_PREFIX, ...args); }

  const STOPWORDS = new Set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an",
    "and", "any", "are", "aren't", "as", "at", "be", "because", "been",
    "before", "being", "below", "between", "both", "but", "by", "can",
    "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does",
    "doesn't", "doing", "don't", "down", "during", "each", "few", "for",
    "from", "further", "get", "gets", "got", "had", "hadn't", "has",
    "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's",
    "her", "here", "here's", "hers", "herself", "him", "himself", "his",
    "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into",
    "is", "isn't", "it", "it's", "its", "itself", "just", "let", "let's",
    "like", "make", "may", "me", "might", "more", "most", "much", "must",
    "mustn't", "my", "myself", "no", "nor", "not", "now", "of", "off",
    "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves",
    "out", "over", "own", "per", "put", "quite", "rather", "re",
    "really", "right", "s", "said", "same", "say", "says", "sha", "shall",
    "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't",
    "since", "so", "some", "something", "still", "such", "t", "take", "than",
    "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
    "there", "there's", "these", "they", "they'd", "they'll", "they're",
    "they've", "this", "those", "through", "to", "too", "under", "until",
    "up", "us", "use", "used", "using", "very", "want", "was", "wasn't",
    "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what",
    "what's", "when", "when's", "where", "where's", "which", "while", "who",
    "who's", "whom", "why", "why's", "will", "with", "won't", "would",
    "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your",
    "yours", "yourself", "yourselves",
    "also", "already", "always", "another", "around", "away", "back",
    "became", "become", "becomes", "becoming", "behind", "beside", "besides",
    "best", "better", "big", "come", "comes", "coming", "day", "days",
    "different", "done", "end", "enough", "even", "every", "example",
    "find", "first", "found", "give", "given", "go", "going", "gone",
    "good", "great", "help", "high", "however", "include",
    "including", "instead", "keep", "kind", "know", "known", "large",
    "last", "later", "least", "less", "long", "look", "looking", "made",
    "many", "means", "need", "needs", "never", "new", "next", "number",
    "often", "old", "one", "ones", "order", "others", "people", "place",
    "point", "possible", "problem", "provide", "provides", "read",
    "result", "run", "running", "see", "set", "several", "show", "shows",
    "side", "simply", "small", "start", "started", "thing",
    "things", "think", "three", "time", "times", "today", "together",
    "top", "turn", "two", "understand", "upon", "way",
    "ways", "well", "without", "work", "working", "works", "world",
    "write", "year", "years", "yet",
    "able", "across", "actually", "almost", "along", "among",
    "call", "called", "case", "certain", "change", "changes", "clear",
    "common", "complete", "consider",
    "early", "easily", "either", "entire",
    "especially", "ever", "fact", "far", "follow", "following", "form",
    "full", "general", "hand", "important", "information", "interest",
    "level", "line", "little", "main", "makes", "mean",
    "move", "name", "note", "nothing", "open", "part", "particular",
    "pass", "passed", "perhaps", "play", "power", "present",
    "put", "quite", "rather", "real", "reason", "require",
    "return", "returns", "second", "sense", "simple", "single", "social",
    "special", "specific", "step", "support", "sure", "take",
    "tell", "terms", "thought", "true", "try", "turn", "value", "values",
    "want", "whole", "word", "words",
    "article", "click", "content", "page", "post", "share", "sign",
    "story", "member", "response", "written", "reading",
    "minutes", "ago", "published", "here"
  ]);

  // ---- TermDetector ----
  class TermDetector {
    constructor(options = {}) {
      this._threshold = options.threshold || 2;
      this._technicalThreshold = 1;
      this._maxContexts = options.maxContexts || 3;
      this._frequency = {};
      this._bigramFreq = {};
      this._contexts = {};
      this._nominated = new Set();
      this._knownTerms = new Set();
    }

    setKnownTerms(terms) {
      this._knownTerms = new Set(terms.map((t) => t.toLowerCase()));
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
            if (this._shouldNominateBigram(bigram)) {
              newCandidates.push(this._buildCandidateBigram(bigram));
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
      const freq = this._frequency[lower] || 0;
      if (this._isTechnicalLooking(original) && freq >= this._technicalThreshold) return true;
      if (freq >= this._threshold) return true;
      return false;
    }

    _shouldNominateBigram(lower) {
      if (this._nominated.has(lower)) return false;
      if (this._knownTerms.has(lower)) return false;
      return (this._bigramFreq[lower] || 0) >= this._threshold;
    }

    _isTechnicalLooking(token) {
      if (/[A-Z].*[A-Z]/.test(token)) return true;
      if (/^[A-Z]{2,}/.test(token)) return true;
      if (/[._]/.test(token)) return true;
      if (/\d/.test(token) && /[a-zA-Z]/.test(token)) return true;
      if (/^[a-z]+[A-Z]/.test(token)) return true;
      return false;
    }

    _buildCandidate(lower) {
      return {
        word: lower,
        count: this._frequency[lower] || 0,
        contexts: (this._contexts[lower] || []).slice(0, this._maxContexts),
      };
    }

    _buildCandidateBigram(lower) {
      return {
        word: lower,
        count: this._bigramFreq[lower] || 0,
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
        .map((t) => t.replace(/^[.\-_]+|[.\-_]+$/g, ""))
        .filter((t) => t.length > 0);
    }

    _splitSentences(text) {
      return text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
    }

    _isStopword(token) {
      return STOPWORDS.has(token.toLowerCase());
    }

    reset() {
      this._frequency = {};
      this._bigramFreq = {};
      this._contexts = {};
      this._nominated = new Set();
    }
  }

  // ---- ReadingTracker ----
  class ReadingTracker {
    constructor(onTextRead) {
      this._onTextRead = onTextRead;
      this._processedElements = new Set();
      this._observer = null;
      this._mutationObserver = null;
      this._debounceTimer = null;
      this._pendingEntries = [];
      this._initialized = false;
      this._totalFlushed = 0;
      this._fallbackTimer = null;
    }

    init() {
      this.destroy();

      const articleEl = this._findArticle();
      if (articleEl) {
        log("Found article container:", articleEl.tagName,
            "classes:", (articleEl.className || "").toString().slice(0, 80) || "(none)",
            "paragraphs:", articleEl.querySelectorAll("p").length);
        this._setupObserver(articleEl);
        this._initialized = true;
        this._scheduleFallback(articleEl);
      } else {
        log("No article element yet, will poll for it...");
        this._waitForArticle();
      }
    }

    _findArticle() {
      const candidates = document.querySelectorAll(
        'article, [role="main"], main, .postArticle, .meteredContent, ' +
        '[data-testid="post-content"], .post-content, .entry-content, ' +
        '.section-content, .story-content'
      );

      let best = null;
      let bestCount = 0;
      for (const el of candidates) {
        const pCount = el.querySelectorAll("p").length;
        if (pCount > bestCount) {
          bestCount = pCount;
          best = el;
        }
      }

      if (best && bestCount >= 2) return best;

      // Fallback: use document.body if it has paragraphs
      const bodyParagraphs = document.body.querySelectorAll("p").length;
      if (bodyParagraphs >= 3) {
        log("Using document.body as fallback (", bodyParagraphs, "paragraphs)");
        return document.body;
      }

      return null;
    }

    _waitForArticle() {
      let attempts = 0;
      const maxAttempts = 30;
      const interval = setInterval(() => {
        attempts++;
        const articleEl = this._findArticle();
        if (articleEl) {
          clearInterval(interval);
          log("Article found after", attempts, "poll attempts");
          this._setupObserver(articleEl);
          this._initialized = true;
          this._scheduleFallback(articleEl);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          log("Polling exhausted, falling back to body scan");
          this._setupObserver(document.body);
          this._initialized = true;
          this._scheduleFallback(document.body);
        }
      }, 500);
    }

    _setupObserver(containerEl) {
      this._containerEl = containerEl;
      this._observer = new IntersectionObserver(
        (entries) => this._handleIntersection(entries),
        { root: null, threshold: 0.1 }
      );
      const sel = "p, h1, h2, h3, h4, h5, h6, pre, li, blockquote, figcaption";
      const elements = containerEl.querySelectorAll(sel);
      log("Observing", elements.length, "text elements for viewport intersection");
      elements.forEach((el) => this._observer.observe(el));
      this._observeNewContent(containerEl);
    }

    _observeNewContent(containerEl) {
      this._mutationObserver = new MutationObserver((mutations) => {
        let added = 0;
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            const sel = "p, h1, h2, h3, h4, h5, h6, pre, li, blockquote, figcaption";
            if (node.matches?.(sel)) {
              this._observer.observe(node);
              added++;
            }
            const children = node.querySelectorAll?.(sel);
            if (children) {
              children.forEach((child) => { this._observer.observe(child); added++; });
            }
          }
        }
        if (added > 0) log("Dynamically observing", added, "new elements");
      });
      this._mutationObserver.observe(containerEl, { childList: true, subtree: true });
    }

    // If IntersectionObserver hasn't picked up anything after 8s, force-scrape
    _scheduleFallback(containerEl) {
      this._fallbackTimer = setTimeout(() => {
        if (this._totalFlushed === 0) {
          warn("IntersectionObserver produced 0 text after 8s, running fallback scrape");
          this.forceScan();
        }
      }, 8000);
    }

    // Grab all text from the container, bypassing IntersectionObserver entirely
    forceScan() {
      const container = this._containerEl || this._findArticle() || document.body;
      const sel = "p, h1, h2, h3, h4, h5, h6, pre, li, blockquote, figcaption";
      const elements = container.querySelectorAll(sel);
      const texts = [];

      for (const el of elements) {
        if (this._processedElements.has(el)) continue;
        this._processedElements.add(el);
        const text = el.textContent?.trim();
        if (text && text.length > 5) texts.push(text);
      }

      log("Force scan found", texts.length, "text blocks from", container.tagName);

      if (texts.length > 0) {
        this._totalFlushed += texts.length;
        this._onTextRead(texts);
      }

      return texts.length;
    }

    _handleIntersection(entries) {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (this._processedElements.has(entry.target)) continue;
        this._pendingEntries.push(entry.target);
      }
      if (this._pendingEntries.length > 0) {
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._flush(), 500);
      }
    }

    _flush() {
      const newTexts = [];
      for (const el of this._pendingEntries) {
        if (this._processedElements.has(el)) continue;
        this._processedElements.add(el);
        this._observer.unobserve(el);
        const text = el.textContent?.trim();
        if (text && text.length > 5) newTexts.push(text);
      }
      this._pendingEntries = [];
      if (newTexts.length > 0) {
        this._totalFlushed += newTexts.length;
        log("Read", newTexts.length, "text blocks via scroll (total:", this._totalFlushed + ")");
        this._onTextRead(newTexts);
      }
    }

    destroy() {
      this._observer?.disconnect();
      this._mutationObserver?.disconnect();
      clearTimeout(this._debounceTimer);
      clearTimeout(this._fallbackTimer);
      this._processedElements.clear();
      this._pendingEntries = [];
      this._initialized = false;
      this._totalFlushed = 0;
      this._containerEl = null;
    }
  }

  /* ---- Main controller ---- */

  let detector = null;
  let tracker = null;
  let currentUrl = location.href;
  let totalCandidatesSent = 0;

  async function initialize() {
    try {
      log("Initializing on", location.href);

      detector = new TermDetector({ threshold: 2, maxContexts: 3 });

      try {
        const result = await chrome.storage.local.get(null);
        const knownWords = [];
        for (const [key, val] of Object.entries(result)) {
          if (key.startsWith("term:") && val.known) {
            knownWords.push(val.word);
          }
        }
        if (knownWords.length > 0) {
          detector.setKnownTerms(knownWords);
          log("Loaded", knownWords.length, "known terms to exclude");
        }
      } catch (e) {
        warn("Storage read failed:", e.message);
      }

      if (tracker) tracker.destroy();
      tracker = new ReadingTracker(onNewTexts);
      tracker.init();
      totalCandidatesSent = 0;
    } catch (e) {
      err("Initialization failed:", e.message, e.stack);
    }
  }

  function onNewTexts(texts) {
    try {
      const candidates = detector.processTexts(texts);

      if (candidates.length > 0) {
        log("Candidates:", candidates.map((c) => `${c.word} (x${c.count})`).join(", "));
        totalCandidatesSent += candidates.length;

        chrome.runtime.sendMessage(
          { type: "NEW_TERMS", terms: candidates },
          (response) => {
            if (chrome.runtime.lastError) {
              warn("Background unreachable:", chrome.runtime.lastError.message);
            } else {
              log("Stored", candidates.length, "terms (total:", totalCandidatesSent + ")");
            }
          }
        );
      } else {
        log("Processed", texts.length, "text blocks but no new candidates yet (freq map size:", Object.keys(detector._frequency).length + ")");
      }
    } catch (e) {
      err("Error processing texts:", e.message, e.stack);
    }
  }

  // Listen for messages from popup (e.g. SCAN_PAGE)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SCAN_PAGE") {
      log("Manual scan requested from popup");
      if (!detector) {
        detector = new TermDetector({ threshold: 2, maxContexts: 3 });
      }
      if (!tracker) {
        tracker = new ReadingTracker(onNewTexts);
      }
      const count = tracker.forceScan();
      sendResponse({ ok: true, scanned: count, candidates: totalCandidatesSent });
      return false;
    }
    if (message.type === "PING") {
      sendResponse({ ok: true, url: location.href, terms: totalCandidatesSent });
      return false;
    }
  });

  // Handle Medium SPA navigation
  function watchForNavigation() {
    const check = () => {
      if (location.href !== currentUrl) {
        log("Navigation detected:", currentUrl, "->", location.href);
        currentUrl = location.href;
        setTimeout(() => initialize(), 1500);
      }
    };

    const origPushState = history.pushState;
    history.pushState = function () {
      origPushState.apply(this, arguments);
      check();
    };
    const origReplaceState = history.replaceState;
    history.replaceState = function () {
      origReplaceState.apply(this, arguments);
      check();
    };
    window.addEventListener("popstate", check);
    setInterval(check, 2000);
  }

  // Boot
  try {
    log("Content script loaded on", location.href);
    initialize();
    watchForNavigation();
  } catch (e) {
    err("Fatal boot error:", e.message, e.stack);
  }
})();
