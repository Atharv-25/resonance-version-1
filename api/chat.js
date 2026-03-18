import { getResoPrompt } from '../src/services/resonancePrompt.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message, userGender } = req.body;
    
    // Load OpenRouter API key from Vercel
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing OPENROUTER_API_KEY in Vercel environment variables' });
    }

    const systemPrompt = getResoPrompt(userGender || 'male');

    // Convert Gemini frontend history format to OpenRouter (OpenAI) format
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

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://resonance-version-1.vercel.app', // Highly recommended by OpenRouter
        'X-Title': 'Resonance Dating Bot',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free', // Ultra reliable completely free OpenRouter model
        temperature: 0.92,
        top_p: 0.95,
        messages: messages
      }),
    });

    const data = await openRouterResponse.json();

    if (!openRouterResponse.ok) {
      if (openRouterResponse.status === 429) {
        return res.status(429).json({ error: 'rate_limit', message: 'OpenRouter rate limit hit.' });
      }
      return res.status(openRouterResponse.status).json({ 
        error: 'api_error', 
        message: data.error?.message || 'OpenRouter API Error' 
      });
    }

    const responseText = data.choices[0].message.content;

    return res.status(200).json({ text: responseText });
    
  } catch (error) {
    console.error('API Backend Error:', error);
    return res.status(500).json({ error: 'internal_error', message: error.message });
  }
}
