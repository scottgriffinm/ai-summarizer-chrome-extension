import React, { useState, useEffect } from 'react';
import { SUPPORTED_MODELS, DEFAULT_MODEL } from './constants';

export default function PopupApp() {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [error, setError] = useState('');
  const [enableShortcut, setEnableShortcut] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['apiKey', 'model', 'enableShortcut'], (data) => {
      if (data.apiKey) setApiKey(data.apiKey);
      if (data.model) setModel(data.model);
      if (typeof data.enableShortcut === 'boolean') {
        setEnableShortcut(data.enableShortcut);
      }
    });
  }, []);

  // Handler for toggling the shortcut on/off
  const handleToggleShortcut = (e) => {
    const enabled = e.target.checked;
    setEnableShortcut(enabled);
    chrome.storage.local.set({ enableShortcut: enabled });
  };

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
    <div className="w-64 bg-black text-white font-sans">
      <div className="p-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 px-3 py-2 rounded-lg mb-3 text-xs">
            {error}
          </div>
        )}

        {/* API Key Input */}
        <div className="mb-4">
          <label className="block text-gray-400 text-xs mb-1.5">OpenAI API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-neutral-900 text-white placeholder-neutral-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
          />
        </div>

        {/* Model Selection */}
        <div className="mb-4 relative">
          <label className="block text-gray-400 text-xs mb-1.5">Model</label>
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="w-full bg-neutral-900 text-white rounded-xl px-3 py-2 text-sm text-left hover:bg-neutral-800 transition-colors flex justify-between items-center"
          >
            <span>{model}</span>
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showModelDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 rounded-xl shadow-lg z-10 py-1 border border-neutral-800">
              {SUPPORTED_MODELS.map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setModel(m);
                    setShowModelDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-800 transition-colors ${
                    m === model ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Shortcut Toggle */}
        <div className="mb-5">
          <label className="flex items-center cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={enableShortcut}
                onChange={handleToggleShortcut}
                className="sr-only"
              />
              <div className={`w-9 h-5 rounded-full transition-colors ${
                enableShortcut ? 'bg-white' : 'bg-neutral-700'
              }`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-black rounded-full transition-transform ${
                  enableShortcut ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </div>
            <span className="ml-2.5 text-xs text-gray-300 group-hover:text-white transition-colors">
              Keyboard shortcut
              <span className="text-gray-500 ml-1">
                ({navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+⇧+S)
              </span>
            </span>
          </label>
        </div>

        {/* Summarize Button */}
        <button
          onClick={handleSummarize}
          className="w-full bg-white text-black font-medium rounded-xl py-2.5 text-sm hover:bg-gray-200 disabled:bg-neutral-700 disabled:text-gray-500 transition-all"
          disabled={!apiKey.trim()}
        >
          Summarize This Page
        </button>
      </div>
    </div>
  );
}