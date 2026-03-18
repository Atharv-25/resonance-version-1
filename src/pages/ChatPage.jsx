import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import useStore from '../store/useStore'
import { storage } from '../services/storage'
import {
  startConversation,
  sendMessage,
  getInitialGreeting,
  detectPhase,
  detectVibe,
} from '../services/chatEngine'
import { saveProfileForMatching } from '../services/personalityAnalyzer'
import './ChatPage.css'

export default function ChatPage() {
  const {
    userGender,
    setUserGender,
    messages,
    addMessage,
    isTyping,
    setTyping,
    currentPhase,
    advancePhase,
    conversationComplete,
    setConversationComplete,
    setProfile,
    setUserInfo,
    resetChat,
  } = useStore()

  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [typingText, setTypingText] = useState('')
  const [isFading, setIsFading] = useState(false) // drives manual fade-out of bot msg + input together
  const typingAbortRef = useRef(null)

  // Typewriter effect — reveals text letter by letter at 55-85ms
  const typewriterText = useCallback((fullText) => {
    return new Promise((resolve) => {
      let i = 0
      setTypingText('')
      setTyping(true)

      const typeNext = () => {
        if (i < fullText.length) {
          i++
          setTypingText(fullText.slice(0, i))
          const delay = 40 + Math.random() * 10 // 40-50ms (formless speed)
          typingAbortRef.current = setTimeout(typeNext, delay)
        } else {
          setTyping(false)
          setTypingText('')
          resolve()
        }
      }

      // Brief pause before typing starts
      typingAbortRef.current = setTimeout(typeNext, 1000)
    })
  }, [setTyping])

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  // Focus input when chat starts
  useEffect(() => {
    if (userGender && !isTyping) {
      inputRef.current?.focus()
    }
  }, [userGender, isTyping, messages])

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-IN'

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInput(prev => prev ? prev + ' ' + transcript : transcript)
        setIsListening(false)
      }

      recognition.onerror = () => {
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  // Handle gender selection → start conversation
  const handleGenderSelect = async (gender) => {
    setUserGender(gender)
    setError('')

    try {
      setTyping(true)
      await startConversation(gender)
      const greeting = await getInitialGreeting(gender)

      // Typewriter effect — shows text letter by letter
      await typewriterText(greeting)
      addMessage({ role: 'bot', text: greeting })
    } catch (err) {
      console.error('Start error:', err)
      setTyping(false)
      setError('connection issue — try refreshing the page')
    }
  }

  // Send message
  const handleSend = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isTyping || conversationComplete || isFading) return

    // Step 1: Trigger fade-out of the entire block (bot msg + input with user's text)
    setIsFading(true)

    // Step 2: Wait for the fade animation to complete
    await new Promise(r => setTimeout(r, 450))

    // Step 3: Now update all state at once (invisible since block is already faded out)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setIsFading(false)
    addMessage({ role: 'user', text })

    // Update phase detection
    const updatedMessages = [...messages, { role: 'user', text }]
    const detectedPhase = detectPhase(updatedMessages)
    if (detectedPhase > currentPhase) {
      advancePhase()
    }

    // Show typing dots while waiting for API
    setTyping(true)

    try {
      const response = await sendMessage(text, updatedMessages)

      // Typewriter effect — shows text letter by letter
      await typewriterText(response.text)
      addMessage({ role: 'bot', text: response.text })

      // Save conversation state
      const allMessages = [...updatedMessages, { role: 'bot', text: response.text }]
      storage.saveConversation(allMessages, currentPhase, '', userGender)

      // Check if conversation is complete
      if (response.isComplete && response.profileData) {
        setConversationComplete()
        setProfile(response.profileData)
        storage.saveProfile(response.profileData)
        saveProfileForMatching(response.profileData)

        if (response.profileData.name) {
          setUserInfo(response.profileData.name, response.profileData.gender || userGender)
        }
      }
    } catch (err) {
      setTyping(false)
      addMessage({
        role: 'bot',
        text: "oops something glitched. mind sending that again? \ud83d\ude4f",
      })
    }
  }

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Toggle mic
  const toggleMic = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  // Auto-resizing input
  const handleInputChange = (e) => {
    setInput(e.target.value)
    
    // Reset height to auto to get the true scrollHeight
    e.target.style.height = 'auto'
    // Set height perfectly to fit the content
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  // Reset
  const handleReset = () => {
    resetChat()
    storage.clearConversation()
    window.location.reload()
  }

  // ════════════════════════════════════
  // RENDER: Gender Selector
  // ════════════════════════════════════
  if (!userGender) {
    return (
      <div className="chat-page">
        <div className="gender-selector">
          <motion.div
            className="gender-selector__content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <h1 className="gender-selector__title">before we start...</h1>
            <p className="gender-selector__subtitle">pick one</p>

            <div className="gender-selector__buttons">
              <motion.button
                className="gender-btn gender-btn--male"
                onClick={() => handleGenderSelect('male')}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="gender-btn__icon">🙋‍♂️</span>
                <span className="gender-btn__label">Male</span>
              </motion.button>

              <motion.button
                className="gender-btn gender-btn--female"
                onClick={() => handleGenderSelect('female')}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="gender-btn__icon">🙋‍♀️</span>
                <span className="gender-btn__label">Female</span>
              </motion.button>
            </div>

            {error && <p className="gender-selector__error">{error}</p>}
          </motion.div>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════
  // RENDER: Chat Interface (Formless-style)
  // ════════════════════════════════════
  return (
    <div className="chat-page">
      {/* Single centered conversation block tied to the current turn */}
      <div className="chat-conversation">
        {(() => {
          const botMsgs = messages.filter(m => m.role === 'bot')
          const userMsgCount = messages.filter(m => m.role === 'user').length

          return (
            <motion.div
              key={`turn-${userMsgCount}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: isFading ? 0 : 1, y: isFading ? -20 : 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              style={{ width: '100%' }}
            >
              {(() => {
                if (conversationComplete) {
                  return (
                    <div className="chat-complete">
                      <p className="chat-complete__text">
                        ✨ conversation complete — thanks for being real
                      </p>
                    </div>
                  )
                }

                if (isTyping) {
                  return (
                    <div className="chat-msg chat-msg--bot">
                      <span className="chat-msg__text">
                        {typingText ? (
                          <>{typingText}<span className="typewriter-cursor">|</span></>
                        ) : (
                          <span className="typing-dots">
                            <span></span><span></span><span></span>
                          </span>
                        )}
                      </span>
                    </div>
                  )
                }

                const botMsg = botMsgs[userMsgCount]
                if (botMsg) {
                  return (
                    <>
                      <div className="chat-msg chat-msg--bot">
                        <span className="chat-msg__text">{botMsg.text}</span>
                      </div>

                      {/* Input field — INSIDE the animated block so it fades with the bot msg */}
                      <div className="chat-inline-input">
                        <form onSubmit={handleSend} className="chat-input-form">
                          <textarea
                            ref={inputRef}
                            className="chat-input"
                            placeholder="Type here..."
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            disabled={isFading}
                            autoFocus
                          />
                        </form>
                      </div>
                    </>
                  )
                }

                return null
              })()}
            </motion.div>
          )
        })()}

      </div>

      {/* Floating mic button — bottom right */}
      {!conversationComplete && userGender && recognitionRef.current && (
        <button
          type="button"
          className={`chat-mic-float ${isListening ? 'chat-mic-float--active' : ''}`}
          onClick={toggleMic}
          disabled={isTyping}
          title="Voice input"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      )}

      {/* Tiny reset button */}
      <button className="chat-reset-btn" onClick={handleReset} title="Start over">
        ↻
      </button>
    </div>
  )
}
