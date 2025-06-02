// ai-summarizer/background.js

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'aiSummarizeSelection',
    title: 'Summarize',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'aiSummarizeSelection') return;

  const text = info.selectionText?.trim();
  if (!text) {
    sendToContent(tab.id, { type: 'error', error: 'No text selected to summarize.' });
    return;
  }

  try {
    // Send to content script
    sendToContent(tab.id, { type: 'summarize', message: `Summarize the following text:\n\n${text}` });
  } catch (err) {
    console.error('OpenAI error:', err);
    sendToContent(tab.id, { type: 'error', error: err.message });
  }
});

// Always try to send to content; if not injected yet, inject and retry.
async function sendToContent(tabId, message) {
  chrome.tabs.sendMessage(tabId, message, async () => {
    if (chrome.runtime.lastError) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['dist/content.bundle.js']
        });
        chrome.tabs.sendMessage(tabId, message);
      } catch (e) {
        console.error('Injection failed:', e);
      }
    }
  });
}