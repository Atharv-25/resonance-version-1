import { GoogleGenerativeAI } from '@google/generative-ai';
import { getResoPrompt } from '../src/services/resonancePrompt.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { history, message, userGender } = req.body;

    // Load API key from process.env (Vercel secures this on the backend)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel environment variables' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemPrompt = getResoPrompt(userGender || 'male');

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.92,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 512,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    });

    const chatSession = model.startChat({
      history: history || [],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
    });

    const result = await chatSession.sendMessage(message);
    const responseText = result.response.text();

    return res.status(200).json({ text: responseText });

  } catch (error) {
    console.error('API Backend Error:', error);
    
    // Check if it's a rate limit error
    const isRateLimit = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED');
    if (isRateLimit) {
      return res.status(429).json({ 
        error: 'rate_limit', 
        message: 'The AI is currently rate limited. Please wait a moment.' 
      });
    }

    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key not valid')) {
      return res.status(401).json({ 
        error: 'invalid_key', 
        message: 'The server API key is invalid.' 
      });
    }

    return res.status(500).json({ error: 'internal_error', message: error.message });
  }
}
