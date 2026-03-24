# TermLearner

A Chrome extension that automatically detects and explains technical terms as you read Medium articles. It tracks your reading progress via scroll position, identifies repeated or technical-looking terms, and generates concise explanations using the Gemini API with Google Search grounding.

## How It Works

1. **You read a Medium article** -- the extension runs in the background on any `medium.com` page.
2. **Scroll-based tracking** -- an `IntersectionObserver` monitors which paragraphs enter your viewport. Only text you've actually scrolled through gets processed.
3. **Term detection** -- tokens are extracted, stopwords are filtered, and frequency is tracked. A term becomes a candidate when it appears 2+ times (or just once if it looks technical -- acronyms, CamelCase, dotted notation, etc.).
4. **Gemini explains it** -- new terms are sent to the Gemini API with Google Search grounding. You get a 2-3 sentence explanation backed by real web sources.
5. **Everything stays local** -- terms, explanations, and metadata are stored in `chrome.storage.local`. No backend, no accounts, no data leaves your browser (except the Gemini API calls you initiate with your own key).

## Installation

### From source (developer mode)

```bash
git clone https://github.com/sneha2koley/termlearner.git
cd termlearner
```

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked** and select the `extension/` folder
4. Click the TermLearner icon in your toolbar and go to **Settings**
5. Enter your [Gemini API key](https://aistudio.google.com/apikey) (free tier available)

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key and paste it into TermLearner's settings page

## Usage

- Navigate to any Medium article and start reading
- As you scroll, the extension silently tracks which paragraphs you've read
- Terms that appear repeatedly (or look technical) are detected and sent for explanation
- Click the **TermLearner** icon in your toolbar to see detected terms
- Use the **magnifying glass** button to manually scan the current page
- **Mark as Known** moves a term to the Known tab (it won't be detected again)
- **Delete** removes a term entirely

## Project Structure

```
extension/
  manifest.json          Manifest V3 configuration
  content.js             Content script (reading tracker + term detector)
  background.js          Service worker (Gemini API calls, storage management)
  popup.html/js/css      Popup UI for viewing and managing terms
  settings.html/js/css   Settings page for Gemini API key
  lib/
    storage.js           chrome.storage.local helpers
    api.js               Gemini REST API wrapper with Google Search grounding
    readingTracker.js     IntersectionObserver-based paragraph tracking
    termDetector.js       Tokenization, frequency analysis, candidate nomination
    stopwords.js          Common English stopwords list
  icons/                 Extension icons (16, 48, 128px)
```

## Architecture

```
Medium article page
        |
  [Content Script]
        |
  IntersectionObserver detects read paragraphs
        |
  TermDetector counts token frequency
        |
  Candidates (freq >= 2 or technical-looking)
        |
  chrome.runtime.sendMessage ──> [Background Service Worker]
                                        |
                                  Check chrome.storage.local
                                        |
                                  If no cached explanation:
                                    Gemini API + Google Search grounding
                                        |
                                  Store term + explanation
                                        |
                                  [Popup UI] reads from storage
```

## Term Detection Rules

| Condition | Threshold |
|-----------|-----------|
| Regular words (not in stopwords, length > 2) | Appears 2+ times |
| Technical-looking (acronyms like API, MCP, PKCE) | Appears 1+ times |
| Technical-looking (CamelCase like JavaScript, OAuth) | Appears 1+ times |
| Technical-looking (dotted like Node.js, v8.x) | Appears 1+ times |
| Bigrams (two-word phrases) | Appears 2+ times |

## Configuration

All configuration is in the content script defaults:

| Setting | Default | Description |
|---------|---------|-------------|
| Frequency threshold | 2 | Minimum occurrences for a regular term |
| Technical threshold | 1 | Minimum occurrences for technical-looking terms |
| Max contexts per term | 3 | Number of example sentences stored |
| Scroll debounce | 500ms | Delay before processing newly visible paragraphs |
| Fallback scan delay | 8s | Auto-scans page if IntersectionObserver finds nothing |

## Privacy

- **No backend server** -- the extension is fully client-side
- **No data collection** -- nothing is tracked or sent anywhere except your Gemini API calls
- **Your API key** stays in `chrome.storage.local` on your machine
- **Gemini API calls** are made directly from your browser using your own key
- The extension only activates on `medium.com` domains

## Tech Stack

- Plain JavaScript (no frameworks, no bundler)
- Chrome Extension Manifest V3
- Gemini 2.5 Flash with Google Search grounding
- `chrome.storage.local` for persistence
- `IntersectionObserver` for scroll tracking

## LICENSE

[MIT](https://github.com/sneha2koley/termlearner/blob/main/LICENSE)
