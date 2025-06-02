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
    chrome.tabs.sendMessage(tab.id, {
      type: 'summarize',
      message: `Summarize the following text:\n\n${text}`
    });


  } catch (err) {
    console.error('OpenAI error:', err);
    sendToContent(tab.id, { type: 'error', error: err.message });
  }
});
