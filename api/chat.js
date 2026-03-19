import { getResoPrompt } from '../src/services/resonancePrompt.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message, userGender } = req.body;
    
    // Load Gemini API key from Vercel env
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel environment variables' });
    }

    const systemPrompt = getResoPrompt(userGender || 'male');

    // Build Gemini-native history format
    // Gemini requires history to start with 'user' and strictly alternate user/model
    let geminiHistory = (history || []).map(msg => ({
      role: msg.role === 'bot' ? 'model' : msg.role,
      parts: msg.parts || [{ text: msg.text || '' }]
    }));

    // Ensure history starts with 'user' (Gemini strict requirement)
    if (geminiHistory.length > 0 && geminiHistory[0].role === 'model') {
      geminiHistory.unshift({
        role: 'user',
        parts: [{ text: '[SYSTEM: Start conversation. Send opening message.]' }]
      });
    }

    // Ensure strictly alternating roles (merge consecutive same-role messages)
    let cleanHistory = [];
    let lastRole = null;
    for (const msg of geminiHistory) {
      if (msg.role !== lastRole) {
        cleanHistory.push(msg);
        lastRole = msg.role;
      } else {
        // Merge with previous
        const prev = cleanHistory[cleanHistory.length - 1];
        prev.parts[0].text += '\n' + msg.parts[0].text;
      }
    }

    // Build the request body for Gemini REST API
    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        ...cleanHistory,
        { role: 'user', parts: [{ text: message }] }
      ],
      generationConfig: {
        temperature: 0.92,
        topP: 0.95,
        maxOutputTokens: 300,
      }
    };

    // Call Gemini REST API directly (NO SDK needed!)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      const errorMsg = data.error?.message || 'Gemini API Error';
      const status = geminiResponse.status;
      
      if (status === 429) {
        return res.status(429).json({ error: 'rate_limit', message: 'Gemini rate limit hit. Wait a moment.' });
      }
      if (status === 400) {
        return res.status(400).json({ error: 'bad_request', message: errorMsg });
      }
      return res.status(status).json({ error: 'api_error', message: errorMsg });
    }

    // Extract text from Gemini's response structure
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      return res.status(500).json({ error: 'empty_response', message: 'Gemini returned an empty response' });
    }

    return res.status(200).json({ text: responseText });
    
  } catch (error) {
    console.error('API Backend Error:', error);
    return res.status(500).json({ error: 'internal_error', message: error.message });
  }
}
