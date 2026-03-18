/**
 * RESONANCE — Chat Engine (Frontend Client)
 * 
 * Manages conversation flow by calling the secure Vercel backend (`/api/chat`).
 * API keys and Google SDK logic are strictly on the server now.
 */

import { PHASE_SIGNALS } from './resonancePrompt'
import { storage } from './storage'

let currentUserGender = null

/**
 * Empty stub for backward compatibility. 
 * The backend is stateless, so we pass history on every request anyway.
 */
export async function startConversation(userGender) {
  currentUserGender = userGender
}

/**
 * Get the initial greeting from Reso (bot speaks first)
 */
export async function getInitialGreeting(userGender) {
  currentUserGender = userGender;
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: [],
          message: "[SYSTEM: Start of a new conversation. Send your opening message. Be warm, casual, use rizz. Follow your opening script. Keep it short — 2-3 sentences max.]",
          userGender: currentUserGender
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) throw new Error('429');
        if (response.status === 401) throw new Error('API_KEY_INVALID');
        throw new Error(data.message || data.error || 'API error');
      }

      return data.text;
    } catch (error) {
      console.error(`Greeting error (attempt ${attempt + 1}):`, error)
      const isRateLimit = error.message.includes('429') || error.message.includes('rate_limit')
      if (isRateLimit && attempt < 1) { // Only retry once
        console.log(`Rate limited, retrying in 2s...`)
        await new Promise(r => setTimeout(r, 2000))
        continue
      }
      break // break out of loop on other errors
    }
  }
  
  // Fallback greeting
  return "hey ✨ I'm Reso. think of me as that one friend who somehow always knows who'd be perfect for you. I'm gonna ask you some stuff — not the boring generic questions tho, promise. but first — what should I call you?"
}

/**
 * Send a message to Reso and get the response
 */
export async function sendMessage(userText, messages = []) {
  if (!currentUserGender) {
    currentUserGender = 'male'
  }

  // The 'messages' array from ChatPage includes the NEW user message at the very end.
  // We need to build the history for the backend EXPECTING the new user message to be separate.
  let historyMessages = messages;
  if (messages.length > 0 && messages[messages.length - 1].text === userText && messages[messages.length - 1].role === 'user') {
    historyMessages = messages.slice(0, -1);
  }

  const historyToPass = historyMessages
    .filter(m => m.role === 'user' || m.role === 'bot')
    .map(m => ({
      role: m.role === 'bot' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }))

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: historyToPass,
          message: userText,
          userGender: currentUserGender
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) throw new Error('429');
        if (response.status === 401) throw new Error('API_KEY_INVALID');
        throw new Error(data.message || data.error || 'API error');
      }

      const responseText = data.text;
      
      // Check if the response contains the profile JSON
      const profileData = extractProfileFromResponse(responseText)
      
      // Clean the response text
      const cleanText = responseText.replace(/\$\$RESONANCE_PROFILE\$\$[\s\S]*?\$\$RESONANCE_PROFILE\$\$/g, '').trim()

      return {
        text: cleanText,
        profileData,
        isComplete: !!profileData,
      }
    } catch (error) {
      console.error(`Chat error (attempt ${attempt + 1}):`, error)
      const isRateLimit = error.message.includes('429') || error.message.includes('rate_limit')
      
      if (isRateLimit && attempt < 1) { 
        console.log(`Rate limited, retrying in 2s...`)
        await new Promise(r => setTimeout(r, 2000))
        continue // try again
      }

      if (isRateLimit) {
        return {
          text: "yo the API expects us to chill for a sec 😅 (rate limit hit). give it a minute and try again?",
          profileData: null,
          isComplete: false,
          error: 'rate_limit',
        }
      }

      if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid')) {
        return {
          text: "the API key isn't working rn 😬 might need a new one",
          profileData: null,
          isComplete: false,
          error: 'invalid_key',
        }
      }

      return {
        text: "oops something glitched on my end. mind sending that again?",
        profileData: null,
        isComplete: false,
        error: error.message,
      }
    }
  }
}

/**
 * Extract profile JSON from Reso's final response
 */
function extractProfileFromResponse(text) {
  const match = text.match(/\$\$RESONANCE_PROFILE\$\$([\s\S]*?)\$\$RESONANCE_PROFILE\$\$/)
  if (!match) return null

  try {
    const profileJSON = match[1].trim()
    const profile = JSON.parse(profileJSON)
    
    if (!profile.name || !profile.big_five) {
      console.warn('Profile missing essential fields')
      return null
    }

    return profile
  } catch (e) {
    console.error('Failed to parse profile JSON:', e)
    return null
  }
}

/**
 * Detect which phase the conversation is likely in
 */
export function detectPhase(messages) {
  const userMessages = messages.filter(m => m.role === 'user')
  const allText = userMessages.map(m => m.text.toLowerCase()).join(' ')
  const count = userMessages.length

  const phases = ['warmup', 'identity', 'lifestyle', 'values', 'deepdive']
  
  for (let i = phases.length - 1; i >= 0; i--) {
    const phase = phases[i]
    const config = PHASE_SIGNALS[phase]
    
    if (count >= config.minExchanges) {
      const signalHits = config.signals.filter(signal => allText.includes(signal)).length
      if (signalHits >= 2) {
        return Math.min(i + 1, phases.length - 1)
      }
    }
  }

  if (count <= 4) return 0
  if (count <= 10) return 1
  if (count <= 16) return 2
  if (count <= 22) return 3
  return 4
}

/**
 * Detect the user's communication vibe
 */
export function detectVibe(messages) {
  const userMessages = messages.filter(m => m.role === 'user')
  if (userMessages.length < 2) return 'unknown'

  const recentTexts = userMessages.slice(-5).map(m => m.text)
  const avgLength = recentTexts.reduce((sum, t) => sum + t.length, 0) / recentTexts.length
  const allText = recentTexts.join(' ').toLowerCase()

  const sarcasmSignals = ['lol', 'sure', 'right', 'yeah right', 'as if', '😂', '🙄', 'seriously', 'wow']
  const sarcasmScore = sarcasmSignals.filter(s => allText.includes(s)).length

  const depthSignals = ['i think', 'i feel', 'honestly', 'actually', 'the thing is', 'i believe', 'what matters']
  const depthScore = depthSignals.filter(s => allText.includes(s)).length

  const playfulSignals = ['haha', '😄', '🔥', 'omg', 'yess', 'love', 'totally', '!', 'aha']
  const playfulScore = playfulSignals.filter(s => allText.includes(s)).length

  if (avgLength < 15) return 'guarded'
  if (sarcasmScore >= 3) return 'sarcastic'
  if (playfulScore >= 3) return 'playful'
  if (depthScore >= 3) return 'thoughtful'
  if (avgLength > 80) return 'open'
  return 'neutral'
}

/**
 * Calculate conversation progress percentage
 */
export function getProgress(messages) {
  const userCount = messages.filter(m => m.role === 'user').length
  return Math.min(Math.round((userCount / 30) * 100), 100)
}

/**
 * Human-like typing delay — shorter bursts with natural jitter
 */
export function humanDelay(text) {
  const baseDelay = 600 + Math.random() * 600
  const perChar = Math.min(text.length * 8, 1500)
  const jitter = Math.random() * 400
  const thinkPause = Math.random() < 0.1 ? 500 : 0
  return new Promise(resolve => setTimeout(resolve, baseDelay + perChar + jitter + thinkPause))
}
