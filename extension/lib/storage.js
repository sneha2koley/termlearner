const TERM_PREFIX = "term:";
const API_KEY_KEY = "gemini_api_key";
const MAX_CONTEXTS = 3;

async function getRaw(keys) {
  return chrome.storage.local.get(keys);
}

async function setRaw(items) {
  return chrome.storage.local.set(items);
}

async function removeRaw(keys) {
  return chrome.storage.local.remove(keys);
}

function termKey(word) {
  return TERM_PREFIX + word.toLowerCase();
}

function makeTermEntry(word, context) {
  return {
    word: word.toLowerCase(),
    count: 1,
    firstSeen: Date.now(),
    contexts: context ? [context] : [],
    explanation: null,
    sources: [],
    known: false,
  };
}

async function getTerm(word) {
  const key = termKey(word);
  const result = await getRaw(key);
  return result[key] || null;
}

async function getAllTerms() {
  const all = await getRaw(null);
  const terms = [];
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith(TERM_PREFIX)) {
      terms.push(value);
    }
  }
  return terms.sort((a, b) => b.firstSeen - a.firstSeen);
}

async function saveTerm(termData) {
  const key = termKey(termData.word);
  const existing = await getTerm(termData.word);

  if (existing) {
    existing.count = termData.count ?? existing.count;
    if (termData.contexts) {
      for (const ctx of termData.contexts) {
        if (!existing.contexts.includes(ctx) && existing.contexts.length < MAX_CONTEXTS) {
          existing.contexts.push(ctx);
        }
      }
    }
    if (termData.explanation) {
      existing.explanation = termData.explanation;
      existing.sources = termData.sources || existing.sources;
    }
    await setRaw({ [key]: existing });
    return existing;
  }

  await setRaw({ [key]: termData });
  return termData;
}

async function markKnown(word) {
  const existing = await getTerm(word);
  if (existing) {
    existing.known = true;
    await setRaw({ [termKey(word)]: existing });
  }
}

async function markUnknown(word) {
  const existing = await getTerm(word);
  if (existing) {
    existing.known = false;
    await setRaw({ [termKey(word)]: existing });
  }
}

async function deleteTerm(word) {
  await removeRaw(termKey(word));
}

async function getApiKey() {
  const result = await getRaw(API_KEY_KEY);
  return result[API_KEY_KEY] || null;
}

async function setApiKey(key) {
  await setRaw({ [API_KEY_KEY]: key });
}

if (typeof globalThis !== "undefined") {
  globalThis.TermStorage = {
    getTerm,
    getAllTerms,
    saveTerm,
    makeTermEntry,
    markKnown,
    markUnknown,
    deleteTerm,
    getApiKey,
    setApiKey,
    TERM_PREFIX,
  };
}
