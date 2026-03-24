const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function explainTerm(term, apiKey) {
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Please set it in the extension settings.");
  }

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const prompt = [
    `Explain the technical term "${term}" concisely in 2-3 sentences.`,
    `Include what it is, why it matters, and a brief practical example or use case.`,
    `Write for a developer who encounters this term while reading a technical article.`,
  ].join(" ");

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData?.error?.message || response.statusText;
    throw new Error(`Gemini API error (${response.status}): ${msg}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  if (!candidate?.content?.parts?.length) {
    throw new Error("Empty response from Gemini API");
  }

  const explanation = candidate.content.parts.map((p) => p.text).join("");

  const sources = [];
  const chunks = candidate.groundingMetadata?.groundingChunks || [];
  for (const chunk of chunks) {
    if (chunk.web?.uri && chunk.web?.title) {
      sources.push({ url: chunk.web.uri, title: chunk.web.title });
    }
  }

  return { explanation, sources };
}

if (typeof globalThis !== "undefined") {
  globalThis.GeminiAPI = { explainTerm };
}
