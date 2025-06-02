// ai-summarizer/src/PopupApp.jsx
import React, { useState, useEffect } from 'react';
import { SUPPORTED_MODELS, DEFAULT_MODEL } from './constants';

export default function PopupApp() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [error, setError] = useState('');

  useEffect(() => {
    chrome.storage.local.get(['apiKey', 'model'], (data) => {
      if (data.apiKey) setApiKey(data.apiKey);
      if (data.model) setModel(data.model);
    });
  }, []);

  const handleSummarize = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key.');
      return;
    }

    // Persist API key + model
    chrome.storage.local.set({ apiKey, model });

    // Retrieve current tab URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setError('Could not find active tab.');
      return;
    }

    // Instruct content script to summarize page
    chrome.tabs.sendMessage(tab.id, {
      type: 'summarize',
      message: `Summarize the following web page:\n\n${tab.url}`
    });

    // Close popup right away
    window.close();
  };

  return (
    <div className="p-4 w-72 font-sans">
      {error && <div className="text-red-500 mb-2">{error}</div>}

      <label className="block mb-1">OpenAI API Key</label>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        className="w-full mb-2 p-1 border rounded"
      />

      <label className="block mb-1">Model</label>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="w-full mb-4 p-1 border rounded"
      >
        {SUPPORTED_MODELS.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <button
        onClick={handleSummarize}
        className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Summarize This Page
      </button>
    </div>
  );
}