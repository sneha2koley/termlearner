(function () {
  "use strict";

  const API_KEY_KEY = "gemini_api_key";
  const apiKeyInput = document.getElementById("apiKeyInput");
  const saveBtn = document.getElementById("saveBtn");
  const feedbackEl = document.getElementById("feedback");
  const backLink = document.getElementById("backLink");

  chrome.storage.local.get(API_KEY_KEY, (result) => {
    if (result[API_KEY_KEY]) {
      apiKeyInput.value = result[API_KEY_KEY];
    }
  });

  saveBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      showFeedback("Please enter a valid API key.", "error");
      return;
    }

    chrome.storage.local.set({ [API_KEY_KEY]: key }, () => {
      if (chrome.runtime.lastError) {
        showFeedback("Failed to save: " + chrome.runtime.lastError.message, "error");
      } else {
        showFeedback("API key saved successfully!", "success");
      }
    });
  });

  backLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.close();
  });

  function showFeedback(message, type) {
    feedbackEl.textContent = message;
    feedbackEl.className = "feedback " + type;
    setTimeout(() => {
      feedbackEl.className = "feedback";
    }, 4000);
  }
})();
