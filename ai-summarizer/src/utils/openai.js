// src/utils/openai.js
export async function fetchChatCompletion({ apiKey, model, messages, maxTokens = 500, temperature = 0.3 }) {
    if (!apiKey) {
      throw new Error('No OpenAI API key provided');
    }
  
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature
      })
    });
  
    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `API error ${resp.status}`);
    }
  
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }