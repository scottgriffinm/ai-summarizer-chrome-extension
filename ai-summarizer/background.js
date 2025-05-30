// 1) Create the "Summarize with AI" context‐menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "aiSummarize",
    title: "Summarize with AI",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "aiSummarize") return;

  // 2) Get the selected text
  const text = info.selectionText?.trim();
  if (!text) {
    safeSendMessage(tab.id, {
      type: "showError",
      error: "No text selected to summarize."
    });
    return;
  }

  // 3) Load stored API key & model
  const { apiKey, model } = await chrome.storage.local.get({
    apiKey: "",
    model: "gpt-4o-mini"
  });

  if (!apiKey) {
    safeSendMessage(tab.id, {
      type: "showError",
      error: "No OpenAI API key set. Click the extension icon to configure it."
    });
    return;
  }

  // 4) Call OpenAI with the selected text
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Summarize the following text:\n\n" + text }
        ],
        max_tokens: 200,
        temperature: 0.5
      })
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `API error ${resp.status}`);
    }

    const data = await resp.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || "No summary returned.";

    // 5) Safely inject content.js and send summary
    safeSendMessage(tab.id, {
      type: "showSummary",
      summary
    });

  } catch (err) {
    console.error("OpenAI error:", err);
    safeSendMessage(tab.id, {
      type: "showError",
      error: err.message
    });
  }
});

// Helper: Try to send a message. If it fails, inject content script and retry.
function safeSendMessage(tabId, message) {
  chrome.tabs.sendMessage(tabId, message, async (response) => {
    if (chrome.runtime.lastError) {
      // Likely no content script loaded yet – inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["dist/content.bundle.js"]
        });
        // Retry sending the message after injection
        chrome.tabs.sendMessage(tabId, message);
      } catch (e) {
        console.error("Injection failed:", e);
      }
    }
  });
}