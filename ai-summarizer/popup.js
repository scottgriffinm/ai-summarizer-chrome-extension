const apiKeyInput = document.getElementById("apiKey");
const modelSelect = document.getElementById("model");
const summarizeButton = document.getElementById("summarizePage");
const outputDiv = document.getElementById("output");

// Load saved API key and model
chrome.storage.local.get(["apiKey", "model"], (data) => {
  if (data.apiKey) apiKeyInput.value = data.apiKey;
  if (data.model) modelSelect.value = data.model;
});

summarizeButton.addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;
  if (!apiKey) {
    outputDiv.textContent = "Please enter your API key.";
    return;
  }
  chrome.storage.local.set({ apiKey, model });
  summarizeButton.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageUrl = tab.url;
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
          { role: "user", content: `Please summarize the content at this URL:\n\n${pageUrl}` }
        ],
        max_tokens: 300,
        temperature: 0.3
      })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${resp.status}`);
    }
    const data = await resp.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || "No summary returned.";

    // Send into the page’s popup and close our dropdown
    chrome.tabs.sendMessage(tab.id, {
      type: "showSummary",
      summary
    });
    window.close();

  } catch (err) {
    // You can also forward errors into the page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, {
      type: "showError",
      error: err.message
    });
    window.close();
  }
});