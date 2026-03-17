import { create } from 'zustand'

const useStore = create((set) => ({
  /* ── Gender ── */
  userGender: null, // 'male' | 'female' | null (not selected yet)
  setUserGender: (gender) => set({ userGender: gender }),

  /* ── Chat State ── */
  messages: [],
  currentPhase: 0,
  phaseNames: ['warmup', 'identity', 'lifestyle', 'values', 'deepdive'],
  isTyping: false,
  conversationComplete: false,
  userName: '',

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, { ...message, timestamp: Date.now() }]
  })),

  setTyping: (typing) => set({ isTyping: typing }),

  advancePhase: () => set((state) => ({
    currentPhase: Math.min(state.currentPhase + 1, state.phaseNames.length - 1)
  })),

  setConversationComplete: () => set({ conversationComplete: true }),

  setUserInfo: (name, gender) => set({ userName: name, userGender: gender || undefined }),

  /* ── Profile State ── */
  profile: null,
  setProfile: (profile) => set({ profile }),

  /* ── Reset ── */
  resetChat: () => set({
    messages: [],
    currentPhase: 0,
    isTyping: false,
    conversationComplete: false,
    profile: null,
    userGender: null,
    userName: '',
  }),
}))

export default useStore
