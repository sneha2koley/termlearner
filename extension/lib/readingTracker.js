class ReadingTracker {
  constructor(onTextRead) {
    this._onTextRead = onTextRead;
    this._processedElements = new Set();
    this._observer = null;
    this._debounceTimer = null;
    this._pendingEntries = [];
    this._initialized = false;
  }

  init() {
    if (this._initialized) return;

    const articleEl = document.querySelector("article");
    if (!articleEl) {
      this._waitForArticle();
      return;
    }

    this._setupObserver(articleEl);
    this._initialized = true;
  }

  _waitForArticle() {
    const mo = new MutationObserver(() => {
      const articleEl = document.querySelector("article");
      if (articleEl) {
        mo.disconnect();
        this._setupObserver(articleEl);
        this._initialized = true;
      }
    });

    mo.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => mo.disconnect(), 30000);
  }

  _setupObserver(articleEl) {
    this._observer = new IntersectionObserver(
      (entries) => this._handleIntersection(entries),
      { root: null, threshold: 0.5 }
    );

    const selectors = "p, h1, h2, h3, h4, h5, h6, pre, li, blockquote";
    const elements = articleEl.querySelectorAll(selectors);
    elements.forEach((el) => this._observer.observe(el));

    this._observeNewContent(articleEl);
  }

  _observeNewContent(articleEl) {
    const mo = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const selectors = "p, h1, h2, h3, h4, h5, h6, pre, li, blockquote";
          if (node.matches?.(selectors)) {
            this._observer.observe(node);
          }
          node.querySelectorAll?.(selectors).forEach((child) => {
            this._observer.observe(child);
          });
        }
      }
    });

    mo.observe(articleEl, { childList: true, subtree: true });
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
      if (text && text.length > 2) {
        newTexts.push(text);
      }
    }

    this._pendingEntries = [];

    if (newTexts.length > 0) {
      this._onTextRead(newTexts);
    }
  }

  destroy() {
    this._observer?.disconnect();
    clearTimeout(this._debounceTimer);
    this._processedElements.clear();
    this._pendingEntries = [];
    this._initialized = false;
  }
}

if (typeof globalThis !== "undefined") {
  globalThis.ReadingTracker = ReadingTracker;
}
