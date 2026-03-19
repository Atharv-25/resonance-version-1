import { getResoPrompt } from '../src/services/resonancePrompt.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message, userGender } = req.body;
    
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GROQ_API_KEY in Vercel environment variables' });
    }

    const systemPrompt = getResoPrompt(userGender || 'male');

    // Convert frontend history format to Groq (OpenAI) format
    const convertedHistory = (history || []).map(msg => ({
      role: msg.role === 'model' || msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.parts ? msg.parts[0].text : (msg.text || '')
    }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...convertedHistory,
      { role: 'user', content: message }
    ];

    // Smart retry logic — silently waits and retries on rate limits
    // User just sees Reso "thinking" a bit longer, never sees an error
    const MAX_RETRIES = 3;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.92,
          top_p: 0.95,
          messages: messages
        }),
      });

      // SUCCESS — return immediately
      if (groqResponse.ok) {
        const data = await groqResponse.json();
        const responseText = data.choices[0].message.content;
        return res.status(200).json({ text: responseText });
      }

      // RATE LIMITED — silently wait and retry
      if (groqResponse.status === 429) {
        if (attempt < MAX_RETRIES - 1) {
          // Wait 8 seconds before next attempt (token limit resets every ~60s)
          await new Promise(r => setTimeout(r, 8000));
          continue;
        }
        // All retries exhausted
        return res.status(429).json({ 
          error: 'rate_limit', 
          message: 'Still rate limited after retries. Wait 30 seconds and try again.' 
        });
      }

      // OTHER ERROR — return immediately
      const errorData = await groqResponse.json();
      return res.status(groqResponse.status).json({ 
        error: 'api_error', 
        message: errorData.error?.message || 'Groq API Error' 
      });
    }
    
  } catch (error) {
    console.error('API Backend Error:', error);
    return res.status(500).json({ error: 'internal_error', message: error.message });
  }
}

