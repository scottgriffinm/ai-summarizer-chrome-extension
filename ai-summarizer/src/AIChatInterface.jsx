import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

const AIChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentModel, setCurrentModel] = useState('gpt-4o-mini');
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [visible, setVisible] = useState(false);
  const messagesEndRef = useRef(null);

  const models = ['gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (msg) => {
      if (msg.type === 'showSummary') {
        setMessages([{ id: Date.now(), type: 'ai', content: msg.summary }]);
        setVisible(true);
      }
      if (msg.type === 'showError') {
        setMessages(prev => [
          ...prev,
          { id: Date.now(), type: 'ai', content: `Error: ${msg.error}` }
        ]);
        setVisible(true);
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const handleSendMessage = async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    const userMsg = { id: Date.now(), type: 'user', content: trimmed };
    const convo = [...messages, userMsg];
    setMessages(convo);
    setInputMessage('');

    const textarea = document.querySelector('textarea');
    if (textarea) textarea.style.height = '40px';

    setIsTyping(true);

    try {
      const { apiKey } = await new Promise(resolve =>
        chrome.storage.local.get(['apiKey'], resolve)
      );
      if (!apiKey) throw new Error('No API key set');

      const payload = [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...convo.map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: currentModel,
          messages: payload,
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `API Error ${response.status}`);
      }

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content?.trim() || '';
      setMessages(prev => [
        ...prev,
        { id: Date.now(), type: 'ai', content: aiContent }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: Date.now(), type: 'ai', content: `Error: ${err.message}` }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 w-[360px] max-h-[500px] max-w-[95vw] z-[9999] shadow-2xl rounded-2xl overflow-hidden bg-neutral-950 text-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 relative flex justify-between items-center bg-black">
        <button
          onClick={() => setShowModelSelect(!showModelSelect)}
          className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
        >
          {currentModel}
        </button>

        <button
          onClick={() => setVisible(false)}
          className="text-gray-400 hover:text-white text-xl font-bold"
        >
          ✕
        </button>

        {showModelSelect && (
          <div className="absolute top-12 left-4 bg-neutral-900 rounded-2xl shadow-lg z-10 py-2">
            {models.map(model => (
              <button
                key={model}
                onClick={() => {
                  setCurrentModel(model);
                  setShowModelSelect(false);
                }}
                className="block w-full text-left px-4 py-3 text-white hover:bg-neutral-800 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
              >
                {model}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-h-[300px]">
        {messages.map(message => (
          <div
            key={message.id}
            className={message.type === 'user' ? 'flex justify-end' : ''}
          >
            <div
              className={`${
                message.type === 'user'
                  ? 'bg-neutral-900 text-white'
                  : 'bg-white text-black'
              } rounded-2xl px-4 py-3 max-w-[80%]`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">
                {message.content}
              </div>
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

      {/* Input */}
      <div className="bg-neutral-900 px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder=""
              className="w-full bg-neutral-900 rounded-2xl px-4 py-2 text-white placeholder-neutral-400 resize-none focus:outline-none transition-all duration-200 text-base leading-6 border border-neutral-700"
              rows="1"
              style={{ minHeight: '40px', maxHeight: '200px' }}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
              }}
            />
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className={`${
              inputMessage.trim() ? 'bg-white text-black' : 'bg-neutral-700 text-black'
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