import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { fetchChatCompletion } from './utils/openai.js';
import { SUPPORTED_MODELS, DEFAULT_MODEL, SELECTION_SUMMARY_PROMPT, PAGE_SUMMARY_PROMPT } from './constants.js';

const AIChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentModel, setCurrentModel] = useState(DEFAULT_MODEL);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [visible, setVisible] = useState(false);
  const messagesEndRef = useRef(null);

  // 1️⃣ Load saved model on mount
  useEffect(() => {
    chrome.storage.local.get('model', ({ model }) => {
      if (model && SUPPORTED_MODELS.includes(model)) {
        setCurrentModel(model);
      }
    });
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Summarize the entire page by calling OpenAI with a "please summarize this URL" prompt.
   */
  const handleSummarizeMessage = useCallback(
    async (msg) => {
      setVisible(true);
      setMessages([]); // Clear previous chat
      setIsTyping(true);

      try {
        const { apiKey, model: storedModel } = await new Promise((resolve) =>
          chrome.storage.local.get(['apiKey', 'model'], resolve)
        );
        if (!apiKey) throw new Error('No API key set');

        const modelToUse = storedModel || currentModel;
        const payload = [
          { role: 'system', content: 'You are a helpful assistant.' },
          {
            role: 'user',
            content: msg
          }
        ];

        // Use shared helper
        const aiContent = await fetchChatCompletion({ apiKey, model: modelToUse, messages: payload });
        setMessages([{ id: Date.now(), type: 'ai', content: aiContent }]);
      } catch (err) {
        setMessages([{ id: Date.now(), type: 'ai', content: `Error: ${err.message}` }]);
      } finally {
        setIsTyping(false);
      }
    },
    [currentModel]
  );

  /**
   * Handle a free‐form user ↔ AI chat (typed in the widget)
   */
  const handleChatMessage = useCallback(async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    const userMsg = { id: Date.now(), type: 'user', content: trimmed };
    const convo = [...messages, userMsg];
    setMessages(convo);
    setInputMessage('');
    setIsTyping(true);

    try {
      const { apiKey } = await new Promise((resolve) =>
        chrome.storage.local.get(['apiKey'], resolve)
      );
      if (!apiKey) throw new Error('No API key set');

      // Rebuild payload from scratch (system + entire conversation)
      const payload = [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...convo.map((m) => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      ];

      const aiContent = await fetchChatCompletion({ apiKey, model: currentModel, messages: payload });
      setMessages((prev) => [...prev, { id: Date.now(), type: 'ai', content: aiContent }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), type: 'ai', content: `Error: ${err.message}` }
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [inputMessage, messages, currentModel]);

  // Listen for summarize messages from background/popup
  useEffect(() => {
    const listener = (msg) => {
      if (msg.type === 'summarize') {
        // First, see if there is any selected text on the page:
        const selection = window.getSelection()?.toString()?.trim();
        if (selection) {
          handleSummarizeMessage(`${SELECTION_SUMMARY_PROMPT}${selection}`);
        } else {
          // No selection → summarize the whole page
          handleSummarizeMessage(`${PAGE_SUMMARY_PROMPT}${window.location.href}`);
        }
        setVisible(true);
      } else if (msg.type === 'error') {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), type: 'ai', content: `Error: ${msg.error}` }
        ]);
        setVisible(true);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [handleSummarizeMessage]);


  // 3️⃣ React to model changes made elsewhere
  useEffect(() => {
    const onStorageChange = (changes, area) => {
      if (area === 'local' && changes.model) {
        const newModel = changes.model.newValue;
        if (SUPPORTED_MODELS.includes(newModel)) {
          setCurrentModel(newModel);
        }
      }
    };
    chrome.storage.onChanged.addListener(onStorageChange);
    return () => chrome.storage.onChanged.removeListener(onStorageChange);
  }, []);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatMessage();
    }
  };

  // Hide widget until either selection or page summary arrives
  if (!visible) return null;

  return (
    <div className="fixed top-1 right-1 w-[400px] h-[600px] max-w-[95vw] max-h-[95vh] z-[9999] shadow-2xl rounded-3xl overflow-hidden bg-black text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 relative flex justify-between items-center">
        <button
          onClick={() => setShowModelSelect((s) => !s)}
          className="text-lg font-medium text-gray-300 hover:text-white transition-colors"
        >
          {currentModel}
        </button>
        <button
          onClick={() => setVisible(false)}
          className="text-gray-400 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800 transition-colors"
        >
          ✕
        </button>

        {showModelSelect && (
          <div className="absolute top-12 left-6 bg-neutral-900 rounded-2xl shadow-lg z-10 py-2 min-w-[200px]">
            {SUPPORTED_MODELS.map((model) => (
              <button
                key={model}
                onClick={() => { setCurrentModel(model); setShowModelSelect(false); chrome.storage.local.set({ model }); }}
                className="block w-full text-left px-4 py-3 text-white hover:bg-neutral-800 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              >
                {model}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {messages.map((message) => (
          <div key={message.id} className={`${message.type === 'user' ? 'flex justify-end' : ''}`}>
            <div
              className={`${message.type === 'user'
                ? 'bg-neutral-900 text-white rounded-2xl px-4 py-3 max-w-[80%]'
                : 'max-w-full'
                }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* User Input */}
      <div className="bg-neutral-900 rounded-t-3xl px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Reply to ${currentModel}`}
              className="w-full bg-neutral-900 rounded-2xl px-4 py-2 text-white placeholder-neutral-400 resize-none focus:outline-none transition-all duration-200 text-base leading-6"
              rows="1"
              style={{ minHeight: '40px', maxHeight: '200px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
            />
          </div>

          <button
            onClick={handleChatMessage}
            disabled={!inputMessage.trim() || isTyping}
            className={`${inputMessage.trim() ? 'bg-white text-black' : 'bg-neutral-700 text-black'
              } rounded-full hover:bg-neutral-600 disabled:bg-neutral-800 disabled:text-neutral-500 transition-all duration-200 flex items-center justify-center shrink-0`}
            style={{ height: '40px', width: '40px' }}
          >
            <ArrowUp className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface;