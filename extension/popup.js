(function () {
  "use strict";

  const TERM_PREFIX = "term:";
  let currentTab = "new";
  let allTerms = [];

  const termListEl = document.getElementById("termList");
  const newCountEl = document.getElementById("newCount");
  const knownCountEl = document.getElementById("knownCount");
  const settingsBtn = document.getElementById("settingsBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const scanBtn = document.getElementById("scanBtn");
  const statusBar = document.getElementById("statusBar");

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTab = btn.dataset.tab;
      render();
    });
  });

  settingsBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
  });

  refreshBtn.addEventListener("click", loadTerms);

  scanBtn.addEventListener("click", async () => {
    setStatus("Scanning page...", "info");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setStatus("No active tab found", "error");
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: "SCAN_PAGE" }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus("Content script not running on this page. Make sure you're on a Medium article and reload the page.", "error");
          return;
        }
        if (response?.ok) {
          setStatus(`Scanned ${response.scanned} text blocks. ${response.candidates} terms found so far.`, "success");
          setTimeout(loadTerms, 1000);
        } else {
          setStatus("Scan returned no results.", "warning");
        }
      });
    } catch (e) {
      setStatus("Error: " + e.message, "error");
    }
  });

  chrome.storage.onChanged.addListener(() => loadTerms());

  function setStatus(message, type) {
    statusBar.textContent = message;
    statusBar.className = "status-bar " + type;
    statusBar.style.display = "block";
    if (type === "success" || type === "info") {
      setTimeout(() => { statusBar.style.display = "none"; }, 5000);
    }
  }

  async function checkContentScript() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const isMedium = tab.url && (tab.url.includes("medium.com") || tab.url.includes("towardsdatascience.com"));
      if (!isMedium) {
        setStatus("Navigate to a Medium article to detect terms.", "info");
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: "PING" }, (response) => {
        if (chrome.runtime.lastError) {
          setStatus("Content script not active. Try reloading the page.", "warning");
        }
      });
    } catch (_) {}
  }

  async function loadTerms() {
    const result = await chrome.storage.local.get(null);
    allTerms = [];
    for (const [key, value] of Object.entries(result)) {
      if (key.startsWith(TERM_PREFIX)) {
        allTerms.push(value);
      }
    }
    allTerms.sort((a, b) => b.firstSeen - a.firstSeen);
    render();
  }

  function render() {
    const filtered = allTerms.filter((t) =>
      currentTab === "new" ? !t.known : t.known
    );

    const newTerms = allTerms.filter((t) => !t.known);
    const knownTerms = allTerms.filter((t) => t.known);
    newCountEl.textContent = newTerms.length;
    knownCountEl.textContent = knownTerms.length;

    if (filtered.length === 0) {
      termListEl.innerHTML = renderEmptyState();
      return;
    }

    termListEl.innerHTML = filtered.map(renderCard).join("");
    attachCardListeners();
  }

  function renderEmptyState() {
    if (currentTab === "new") {
      return `
        <div class="empty-state">
          <div class="empty-icon">&#128214;</div>
          <p>No new terms yet.<br>Open a Medium article and scroll through it, or click the <strong>&#x1F50D;</strong> button above to scan the current page.</p>
        </div>`;
    }
    return `
      <div class="empty-state">
        <div class="empty-icon">&#9989;</div>
        <p>No known terms yet.<br>Mark terms as known and they'll move here.</p>
      </div>`;
  }

  function renderCard(term) {
    const explanationHtml = term.explanation
      ? `<div class="term-explanation">${escapeHtml(term.explanation)}</div>`
      : `<div class="term-explanation loading"><span class="spinner"></span>Fetching explanation...</div>`;

    const sourcesHtml =
      term.sources?.length > 0
        ? `<div class="term-sources">${term.sources
            .slice(0, 3)
            .map(
              (s) =>
                `<a class="source-link" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a>`
            )
            .join("")}</div>`
        : "";

    const contextHtml =
      term.contexts?.length > 0
        ? `<div class="term-context">"${escapeHtml(term.contexts[0])}"</div>`
        : "";

    const actionBtnHtml = term.known
      ? `<button class="action-btn unmark" data-action="unmark" data-word="${escapeHtml(term.word)}">Unmark</button>`
      : `<button class="action-btn known" data-action="known" data-word="${escapeHtml(term.word)}">Mark Known</button>`;

    return `
      <div class="term-card" data-word="${escapeHtml(term.word)}">
        <div class="term-header">
          <span class="term-word">${escapeHtml(term.word)}</span>
          <span class="freq-badge">&times;${term.count}</span>
        </div>
        ${explanationHtml}
        ${sourcesHtml}
        ${contextHtml}
        <div class="term-actions">
          ${actionBtnHtml}
          <button class="action-btn delete" data-action="delete" data-word="${escapeHtml(term.word)}">Delete</button>
        </div>
      </div>`;
  }

  function attachCardListeners() {
    termListEl.querySelectorAll(".action-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const action = e.target.dataset.action;
        const word = e.target.dataset.word;

        if (action === "known") {
          await chrome.runtime.sendMessage({ type: "MARK_KNOWN", word });
        } else if (action === "unmark") {
          await chrome.runtime.sendMessage({ type: "MARK_UNKNOWN", word });
        } else if (action === "delete") {
          await chrome.runtime.sendMessage({ type: "DELETE_TERM", word });
        }
        await loadTerms();
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  loadTerms();
  checkContentScript();
})();
