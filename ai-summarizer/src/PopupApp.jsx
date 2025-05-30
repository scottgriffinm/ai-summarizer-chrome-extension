import React, { useState, useEffect } from 'react';

export default function PopupApp() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [error, setError] = useState('');

  useEffect(() => {
    chrome.storage.local.get(['apiKey', 'model'], data => {
      if (data.apiKey) setApiKey(data.apiKey);
      if (data.model) setModel(data.model);
    });
  }, []);

  const handleSummarize = async () => {
    if (!apiKey.trim()) return setError('Please enter your API key.');
    chrome.storage.local.set({ apiKey, model });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: {
          'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model, messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Please summarize the content at this URL:\n\n${tab.url}` }
        ] })
      });
      if (!resp.ok) throw new Error((await resp.json()).error?.message || resp.status);
      const { choices } = await resp.json();
      chrome.tabs.sendMessage(tab.id, { type: 'showSummary', summary: choices[0].message.content });
      window.close();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="p-4 w-72 font-sans">
      <h1 className="text-lg font-bold mb-2">Summarize with AI</h1>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <label className="block mb-1">OpenAI API Key</label>
      <input
        type="password"
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
        className="w-full mb-2 p-1 border rounded"
      />
      <label className="block mb-1">Model</label>
      <select
        value={model}
        onChange={e => setModel(e.target.value)}
        className="w-full mb-4 p-1 border rounded"
      >
        <option>gpt-4o-mini</option>
        <option>gpt-4</option>
        <option>gpt-3.5-turbo</option>
      </select>
      <button
        onClick={handleSummarize}
        className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >Summarize This Page</button>
    </div>
  );
}