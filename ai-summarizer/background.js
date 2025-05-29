// background.js

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
    chrome.tabs.sendMessage(tab.id, {
      type: "showError",
      error: "No text selected to summarize."
    });
    return;
  }

  // 3) Load your stored API key & model
  const { apiKey, model } = await chrome.storage.local.get({
    apiKey: "",
    model: "gpt-4o-mini"
  });

  if (!apiKey) {
    chrome.tabs.sendMessage(tab.id, {
      type: "showError",
      error: "No OpenAI API key set. Click the extension icon to configure it."
    });
    return;
  }

  // 4) Dynamically inject content.js to ensure the page can receive our message
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  } catch (injectErr) {
    console.error("Failed to inject content script:", injectErr);
    chrome.tabs.sendMessage(tab.id, {
      type: "showError",
      error: "Could not inject content script."
    });
    return;
  }

  // 5) Call OpenAI with the selected text
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

    // 6) Send the summary back into the page
    chrome.tabs.sendMessage(tab.id, {
      type: "showSummary",
      summary
    });

  } catch (err) {
    console.error("OpenAI error:", err);
    chrome.tabs.sendMessage(tab.id, {
      type: "showError",
      error: err.message
    });
  }
});