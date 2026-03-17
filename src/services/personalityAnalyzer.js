/**
 * RESONANCE — Personality Analyzer
 * 
 * Processes the raw profile data extracted by Reso and generates
 * the Personality Portrait with insights and match compatibility data.
 */

/**
 * Generate personality insights from the raw profile
 */
export function generatePersonalityInsights(profile) {
  if (!profile) return null

  const b5 = profile.big_five
  const insights = []

  // Big Five insights
  if (b5.openness > 70) {
    insights.push("You're a natural explorer — curious, creative, and drawn to new experiences.")
  } else if (b5.openness < 40) {
    insights.push("You value depth over novelty — you know what you like and go deep on it.")
  } else {
    insights.push("You balance curiosity with comfort — open to new things but selective about what you pursue.")
  }

  if (b5.conscientiousness > 70) {
    insights.push("You've got structure in your DNA. Reliable, organized, and your word means something.")
  } else if (b5.conscientiousness < 40) {
    insights.push("You're spontaneous and flexible — rules are more like guidelines to you.")
  }

  if (b5.extraversion > 70) {
    insights.push("People energize you. You light up in social settings and draw others in naturally.")
  } else if (b5.extraversion < 40) {
    insights.push("Your inner world is rich. You're selective about your energy and value deep connections over many.")
  }

  if (b5.agreeableness > 70) {
    insights.push("You lead with empathy. People feel safe around you because you genuinely care.")
  } else if (b5.agreeableness < 40) {
    insights.push("You're authentic to a fault — you'd rather be real than polite, and people respect that directness.")
  }

  if (b5.neuroticism > 70) {
    insights.push("You feel deeply. That sensitivity is a gift — it means you'll love with your whole heart.")
  } else if (b5.neuroticism < 40) {
    insights.push("You're emotionally steady. People find your calm presence grounding and reassuring.")
  }

  return insights
}

/**
 * Generate attachment style description
 */
export function getAttachmentDescription(style) {
  const descriptions = {
    secure: {
      title: 'Secure',
      emoji: '🏠',
      short: "You're comfortable with closeness and independence.",
      detail: "You trust easily, communicate openly, and create stable emotional bonds. You don't play games — you show up authentically and expect the same.",
      strengths: ['Emotional availability', 'Healthy boundaries', 'Effective communication'],
      inRelationship: "You're the partner who makes the other person feel safe to be themselves.",
    },
    anxious: {
      title: 'Anxious',
      emoji: '🌊',
      short: "You love deeply and crave closeness.",
      detail: "You're passionate and emotionally attuned. You notice everything. Sometimes your need for reassurance can be intense, but it comes from a place of deep caring.",
      strengths: ['Deep emotional awareness', 'Devotion', 'Attentiveness to partner'],
      inRelationship: "You notice things others miss and love with incredible intensity.",
    },
    avoidant: {
      title: 'Avoidant',
      emoji: '🗻',
      short: "You value independence and self-reliance.",
      detail: "You're strong and self-sufficient. Emotional closeness can feel overwhelming sometimes, but when you let someone in, it's deeply meaningful.",
      strengths: ['Self-sufficiency', 'Emotional resilience', 'Respect for boundaries'],
      inRelationship: "You bring stability and independence — qualities that deepen trust over time.",
    },
    disorganized: {
      title: 'Fearful-Avoidant',
      emoji: '🌪️',
      short: "You crave connection but protect yourself fiercely.",
      detail: "You have a complex emotional landscape — wanting closeness but also fearing it. This duality makes you deeply human and incredibly empathetic to others' pain.",
      strengths: ['Deep empathy', 'Emotional complexity', 'Resilience'],
      inRelationship: "Your journey toward trust is beautiful and rewards the right person with incredible depth.",
    },
  }
  return descriptions[style] || descriptions.secure
}

/**
 * Generate love language description
 */
export function getLoveLanguageDescription(language) {
  const descriptions = {
    words_of_affirmation: {
      title: 'Words of Affirmation',
      emoji: '💌',
      description: "You feel loved through words — compliments, encouragement, \"I love you,\" or even a thoughtful text. Words aren't just words to you, they're proof.",
      givenTo: "Your partner should express appreciation verbally and text you something sweet randomly.",
    },
    quality_time: {
      title: 'Quality Time',
      emoji: '🫂',
      description: "Undivided attention is everything. Put the phone down, look at you, be present — that's what love feels like to you.",
      givenTo: "Your partner should prioritize being fully present — no distractions, just you two.",
    },
    acts_of_service: {
      title: 'Acts of Service',
      emoji: '🛠️',
      description: "Actions speak louder. When someone does something for you — makes coffee, handles a chore, helps with a problem — that's love in action.",
      givenTo: "Your partner should show love by doing, not just saying. Help without being asked.",
    },
    receiving_gifts: {
      title: 'Receiving Gifts',
      emoji: '🎁',
      description: "It's not about materialism — it's the thought. A small surprise that shows 'I was thinking of you' hits you differently.",
      givenTo: "Your partner should surprise you with small, thoughtful tokens that show they pay attention.",
    },
    physical_touch: {
      title: 'Physical Touch',
      emoji: '🤝',
      description: "A hand hold, a hug, sitting close — physical connection is your emotional anchor. Touch grounds you and makes you feel safe.",
      givenTo: "Your partner should be affectionate physically — proximity and touch are essential.",
    },
  }
  return descriptions[language] || descriptions.quality_time
}

/**
 * Generate the radar chart data for the Personality Portrait
 */
export function getRadarChartData(profile) {
  if (!profile?.big_five) return []

  return [
    { trait: 'Openness', value: profile.big_five.openness, fullMark: 100 },
    { trait: 'Conscientiousness', value: profile.big_five.conscientiousness, fullMark: 100 },
    { trait: 'Extraversion', value: profile.big_five.extraversion, fullMark: 100 },
    { trait: 'Agreeableness', value: profile.big_five.agreeableness, fullMark: 100 },
    { trait: 'Emotional Depth', value: profile.big_five.neuroticism, fullMark: 100 },
  ]
}

/**
 * Generate compatibility radar chart data for a match
 */
export function getCompatibilityRadarData(score) {
  if (!score?.breakdown) return []

  return [
    { dimension: 'Emotional', value: score.breakdown.emotional || 0, fullMark: 100 },
    { dimension: 'Intellectual', value: score.breakdown.intellectual || 0, fullMark: 100 },
    { dimension: 'Lifestyle', value: score.breakdown.lifestyle || 0, fullMark: 100 },
    { dimension: 'Values', value: score.breakdown.values || 0, fullMark: 100 },
    { dimension: 'Preferences', value: score.breakdown.preferences || 0, fullMark: 100 },
  ]
}

/**
 * Get trait label for a given Big Five score
 */
export function getTraitLabel(trait, score) {
  const labels = {
    openness: score > 70 ? 'Explorer' : score > 40 ? 'Balanced' : 'Grounded',
    conscientiousness: score > 70 ? 'Structured' : score > 40 ? 'Flexible' : 'Free Spirit',
    extraversion: score > 70 ? 'Social Butterfly' : score > 40 ? 'Ambivert' : 'Inner World',
    agreeableness: score > 70 ? 'Empathetic' : score > 40 ? 'Balanced' : 'Direct',
    neuroticism: score > 70 ? 'Deep Feeler' : score > 40 ? 'Composed' : 'Steady Rock',
  }
  return labels[trait] || 'Balanced'
}

/**
 * Store profile for later matching
 */
export function saveProfileForMatching(profile) {
  const existing = JSON.parse(localStorage.getItem('resonance_all_profiles') || '[]')
  
  // Check if this person already has a profile
  const index = existing.findIndex(p => p.name === profile.name && p.age === profile.age)
  if (index >= 0) {
    existing[index] = { ...profile, updatedAt: Date.now() }
  } else {
    existing.push({ ...profile, id: `user_${Date.now()}`, createdAt: Date.now() })
  }
  
  localStorage.setItem('resonance_all_profiles', JSON.stringify(existing))
  return existing
}
