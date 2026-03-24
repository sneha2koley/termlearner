importScripts("lib/storage.js", "lib/api.js");

const processingQueue = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "NEW_TERMS") {
    handleNewTerms(message.terms).then(
      () => sendResponse({ ok: true }),
      (err) => sendResponse({ ok: false, error: err.message })
    );
    return true; // keep the message channel open for async response
  }

  if (message.type === "GET_TERMS") {
    TermStorage.getAllTerms().then(
      (terms) => sendResponse({ ok: true, terms }),
      (err) => sendResponse({ ok: false, error: err.message })
    );
    return true;
  }

  if (message.type === "MARK_KNOWN") {
    TermStorage.markKnown(message.word).then(
      () => sendResponse({ ok: true }),
      (err) => sendResponse({ ok: false, error: err.message })
    );
    return true;
  }

  if (message.type === "MARK_UNKNOWN") {
    TermStorage.markUnknown(message.word).then(
      () => sendResponse({ ok: true }),
      (err) => sendResponse({ ok: false, error: err.message })
    );
    return true;
  }

  if (message.type === "DELETE_TERM") {
    TermStorage.deleteTerm(message.word).then(
      () => sendResponse({ ok: true }),
      (err) => sendResponse({ ok: false, error: err.message })
    );
    return true;
  }
});

async function handleNewTerms(terms) {
  for (const term of terms) {
    const entry = TermStorage.makeTermEntry(term.word, term.contexts?.[0]);
    entry.count = term.count;
    entry.contexts = term.contexts || [];

    await TermStorage.saveTerm(entry);
    fetchExplanationIfNeeded(term.word);
  }
}

async function fetchExplanationIfNeeded(word) {
  if (processingQueue.has(word)) return;

  const existing = await TermStorage.getTerm(word);
  if (existing?.explanation) return;

  processingQueue.set(word, true);

  try {
    const apiKey = await TermStorage.getApiKey();
    if (!apiKey) return;

    const result = await GeminiAPI.explainTerm(word, apiKey);
    await TermStorage.saveTerm({
      word,
      explanation: result.explanation,
      sources: result.sources,
    });
  } catch (err) {
    console.error(`TermLearner: failed to explain "${word}":`, err.message);
  } finally {
    processingQueue.delete(word);
  }
}
