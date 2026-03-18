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
      model: 'gemini-1.5-flash-8b',
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

    // Gemini SDK STRICTLY requires history to start with 'user' and alternate.
    // If the history starts with 'model' (because Reso sent the greeting first),
    // we must prepend the hidden system trigger message that actually started the chain.
    let safeHistory = history || [];
    if (safeHistory.length > 0 && safeHistory[0].role === 'model') {
      safeHistory.unshift({
        role: 'user',
        parts: [{ text: "[SYSTEM: Start of a new conversation. Send your opening message. Be warm, casual, use rizz. Follow your opening script. Keep it short — 2-3 sentences max.]" }]
      });
    }

    // Additionally, Gemini SDK requires strictly alternating history.
    // Let's filter out consecutive duplicates in roles just to be insanely safe.
    let alternatingHistory = [];
    let lastRole = null;
    for (const msg of safeHistory) {
      if (msg.role !== lastRole) {
        alternatingHistory.push({
          role: msg.role === 'bot' ? 'model' : msg.role, // Just in case bot leaked through
          parts: msg.parts
        });
        lastRole = msg.role;
      } else {
        // If there are two consecutive users or models, combine their text
        const lastIndex = alternatingHistory.length - 1;
        alternatingHistory[lastIndex].parts[0].text += '\n\n' + msg.parts[0].text;
      }
    }

    const chatSession = model.startChat({
      history: alternatingHistory,
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
