import { getResoPrompt } from '../src/services/resonancePrompt.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message, userGender } = req.body;
    
    // Load BOTH Groq API keys for failover rotation
    const keys = [
      process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_2
    ].filter(Boolean); // Remove any undefined keys
    
    if (keys.length === 0) {
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

    // Dual-key failover with smart retry
    // Try Key 1 → if rate limited → try Key 2 → if still limited → wait & retry Key 1
    for (let attempt = 0; attempt < keys.length + 1; attempt++) {
      const keyIndex = attempt % keys.length;
      const apiKey = keys[keyIndex];

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

      // RATE LIMITED — try next key, or wait and retry
      if (groqResponse.status === 429) {
        if (attempt < keys.length - 1) {
          // Still have another key to try — switch immediately
          continue;
        }
        if (attempt === keys.length - 1 && keys.length > 1) {
          // Both keys exhausted once — wait 8s and try first key again
          await new Promise(r => setTimeout(r, 8000));
          continue;
        }
        // All retries exhausted
        return res.status(429).json({ 
          error: 'rate_limit', 
          message: 'Both API keys are rate limited. Wait 30 seconds and try again.' 
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

