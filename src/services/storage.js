/* ── LocalStorage wrapper for prototype persistence ── */

const KEYS = {
  CONVERSATION: 'resonance_conversation',
  PROFILE: 'resonance_profile',
  WAITLIST: 'resonance_waitlist',
  ALL_PROFILES: 'resonance_all_profiles',
  MATCH_RESULTS: 'resonance_match_results',
  API_KEY: 'resonance_api_key',
}

export const storage = {
  /* ── Conversation ── */
  saveConversation(messages, phase, userName, userGender) {
    localStorage.setItem(KEYS.CONVERSATION, JSON.stringify({
      messages,
      phase,
      userName,
      userGender,
      savedAt: Date.now(),
    }))
  },

  loadConversation() {
    const data = localStorage.getItem(KEYS.CONVERSATION)
    return data ? JSON.parse(data) : null
  },

  clearConversation() {
    localStorage.removeItem(KEYS.CONVERSATION)
  },

  /* ── Profile ── */
  saveProfile(profile) {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile))
  },

  loadProfile() {
    const data = localStorage.getItem(KEYS.PROFILE)
    return data ? JSON.parse(data) : null
  },

  /* ── Waitlist ── */
  saveWaitlistEntry(entry) {
    const existing = this.loadWaitlist()
    existing.push({ ...entry, submittedAt: Date.now() })
    localStorage.setItem(KEYS.WAITLIST, JSON.stringify(existing))
  },

  loadWaitlist() {
    const data = localStorage.getItem(KEYS.WAITLIST)
    return data ? JSON.parse(data) : []
  },

  /* ── All Profiles (Admin) ── */
  saveAllProfiles(profiles) {
    localStorage.setItem(KEYS.ALL_PROFILES, JSON.stringify(profiles))
  },

  loadAllProfiles() {
    const data = localStorage.getItem(KEYS.ALL_PROFILES)
    return data ? JSON.parse(data) : []
  },

  /* ── Match Results (Admin) ── */
  saveMatchResults(results) {
    localStorage.setItem(KEYS.MATCH_RESULTS, JSON.stringify(results))
  },

  loadMatchResults() {
    const data = localStorage.getItem(KEYS.MATCH_RESULTS)
    return data ? JSON.parse(data) : []
  },

  /* ── API Key ── */
  saveApiKey(key) {
    localStorage.setItem(KEYS.API_KEY, key)
  },

  loadApiKey() {
    return localStorage.getItem(KEYS.API_KEY) || ''
  },

  /* ── Export for Python backend ── */
  exportConversationJSON() {
    const conv = this.loadConversation()
    if (!conv) return null
    const blob = new Blob([JSON.stringify(conv, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resonance_conversation_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    return conv
  },

  exportProfileJSON() {
    const profile = this.loadProfile()
    if (!profile) return null
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resonance_profile_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    return profile
  },
}
