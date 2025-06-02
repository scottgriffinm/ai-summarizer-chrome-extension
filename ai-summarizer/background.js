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
    chrome.tabs.sendMessage(tab.id, { type: 'error', error: 'No text selected to summarize.' });
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
    chrome.tabs.sendMessage(tab.id, { type: 'error', error: err.message });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'summarize-shortcut') return;

  // Check if the toggle is enabled
  chrome.storage.local.get('enableShortcut', (result) => {
    if (!result.enableShortcut) {
      return; // do nothing if toggle is off
    }

    // Find the active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;
      // Ask the content script to figure out selection vs. page
      chrome.tabs.sendMessage(tab.id, { type: 'shortcutSummarize' });
    });
  });
});
