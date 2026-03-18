import { getResoPrompt } from '../src/services/resonancePrompt.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message, userGender } = req.body;
    
    // Load Groq API key from Vercel
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GROQ_API_KEY in Vercel environment variables' });
    }

    const systemPrompt = getResoPrompt(userGender || 'male');

    // Convert Gemini frontend history format to Groq (OpenAI) format
    const convertedHistory = (history || []).map(msg => ({
      role: msg.role === 'model' || msg.role === 'bot' ? 'assistant' : 'user',
      content: msg.parts[0].text
    }));

    // Construct the payload array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...convertedHistory,
      { role: 'user', content: message }
    ];

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // 131K TPM free tier — 20x more headroom than 70b
        temperature: 0.92,
        top_p: 0.95,
        messages: messages
      }),
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      if (groqResponse.status === 429) {
        return res.status(429).json({ error: 'rate_limit', message: 'Groq rate limit hit. (Wait 60s)' });
      }
      return res.status(groqResponse.status).json({ 
        error: 'api_error', 
        message: data.error?.message || 'Groq API Error' 
      });
    }

    const responseText = data.choices[0].message.content;

    return res.status(200).json({ text: responseText });
    
  } catch (error) {
    console.error('API Backend Error:', error);
    return res.status(500).json({ error: 'internal_error', message: error.message });
  }
}
