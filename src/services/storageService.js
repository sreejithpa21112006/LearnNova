/**
 * Storage Service
 * Manages LocalStorage persistence for decks, reading sessions, and user preferences.
 */

const STORAGE_KEYS = {
  DECKS: "learnnova_decks",
  ACTIVE_SESSION: "learnnova_active_session",
  SETTINGS: "learnnova_settings",
  STATS: "learnnova_user_stats",
  STUDY_SETS: "learnnova_study_sets",
  HISTORY: "learnnova_study_history"
};

const DEFAULT_SETTINGS = {
  readingWpm: 200,
  sensitivity: "medium", // 'low' | 'medium' | 'high'
  isAvatarEnabled: true,
  cardDensity: "medium", // 'low' | 'medium' | 'high'
  algorithm: "fsrs",     // 'fsrs' | 'sm2'
  isMascotVoiceEnabled: false,
  mascotSkin: "duo-owl", // 'duo-owl' | 'sparky-pup'
  geminiApiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || ""
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      geminiApiKey: parsed.geminiApiKey || DEFAULT_SETTINGS.geminiApiKey
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings to localStorage", e);
  }
}

export function getSavedDecks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DECKS);
    if (raw) {
      const decks = JSON.parse(raw);
      if (Array.isArray(decks)) {
        // Strip out the old hardcoded sample deck
        const filtered = decks.filter(d => d.id !== 'starter-raft-deck');
        if (filtered.length !== decks.length) {
          // Persist the cleaned list
          saveSavedDecks(filtered);
        }
        return filtered;
      }
    }
    return [];
  } catch (e) {
    return [];
  }
}

export function saveSavedDecks(decks) {
  try {
    localStorage.setItem(STORAGE_KEYS.DECKS, JSON.stringify(decks));
  } catch (e) {
    console.error("Failed to save decks to localStorage", e);
  }
}

export function saveDeck(deck) {
  const decks = getSavedDecks();
  const existingIdx = decks.findIndex(d => d.id === deck.id);
  if (existingIdx >= 0) {
    decks[existingIdx] = deck;
  } else {
    decks.unshift(deck);
  }
  saveSavedDecks(decks);
  return decks;
}

export function deleteDeck(deckId) {
  const decks = getSavedDecks().filter(d => d.id !== deckId);
  saveSavedDecks(decks);
  return decks;
}

export function updateCardReview(deckId, updatedCard) {
  const decks = getSavedDecks();
  const deck = decks.find(d => d.id === deckId);
  if (!deck) return null;

  const cardIdx = deck.cards.findIndex(c => c.id === updatedCard.id);
  if (cardIdx >= 0) {
    deck.cards[cardIdx] = updatedCard;
    deck.lastStudiedAt = new Date().toISOString();
    saveSavedDecks(decks);
  }
  return deck;
}

export function getSavedStudySets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDY_SETS);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveStudySets(sets) {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDY_SETS, JSON.stringify(sets));
  } catch (e) {
    console.error("Failed to save study sets to localStorage", e);
  }
}

// ---------------------------------------------------------------------------
// Study History & Traceback Persistence Service
// ---------------------------------------------------------------------------

const SEED_HISTORY = [
  {
    id: "hist-seed-1",
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12 mins ago
    type: "flashcard", // 'flashcard' | 'quiz' | 'reading' | 'lecture' | 'copilot_challenge'
    title: "Leader Election in Raft",
    subtitle: "Raft Consensus Algorithm Flashcards",
    deckId: "raft-deck",
    cardId: "c-1",
    question: "What triggers a Raft follower node to transition into a candidate state?",
    userAnswer: "The node's election timer expires without receiving heartbeats from a leader.",
    targetAnswer: "A follower transitions to candidate when its randomized election timer elapses without receiving valid AppendEntries RPC heartbeats from the current leader.",
    aiScore: 89,
    aiVerdict: "High Concept Match",
    aiFeedback: "Excellent recall! You accurately identified the randomized election timer expiration and missing leader heartbeats.",
    grade: 3, // Good
    gradeLabel: "Good",
    algorithm: "fsrs",
    xpEarned: 8
  },
  {
    id: "hist-seed-2",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    type: "copilot_challenge",
    title: "Nova Copilot Interactive Challenge",
    subtitle: "Section 2: Raft Consensus Foundations",
    chunkIndex: 1,
    question: "Why does Raft use randomized election timeouts for candidate elections?",
    selectedOption: "To prevent split-vote deadlocks where multiple candidates split the vote equally",
    correctOption: "To prevent split-vote deadlocks where multiple candidates split the vote equally",
    isCorrect: true,
    explanation: "Randomized election timeouts (typically 150-300ms) ensure that usually only a single server times out and wins election before others can.",
    xpEarned: 15
  },
  {
    id: "hist-seed-3",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    type: "quiz",
    title: "Raft Foundations Practice Assessment",
    subtitle: "Bloom's Diagnostic Exam",
    score: 4,
    totalQuestions: 5,
    accuracy: 80,
    questions: [
      { question: "What is the primary role of a leader node in Raft?", isCorrect: true },
      { question: "How does Raft ensure log consistency between nodes?", isCorrect: true },
      { question: "What occurs during a network partition?", isCorrect: false },
      { question: "Which RPC is used for leader heartbeats?", isCorrect: true },
      { question: "How are committed entries determined in Raft?", isCorrect: true }
    ],
    xpEarned: 35
  },
  {
    id: "hist-seed-4",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    type: "reading",
    title: "Section 1: Motivation & The Understandability Gap",
    subtitle: "Document Reading & Checkpoint",
    chunkIndex: 0,
    dwellSeconds: 145,
    wpm: 210,
    checkpointQuestion: "Why was Paxos difficult for engineers to implement in production?",
    selectedOption: "Its formal description left major gaps for practical systems and state-machine replication",
    isCorrect: true,
    xpEarned: 20
  }
];

export function getStudyHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Seed initial records so the timeline is never an empty void
    saveStudyHistory(SEED_HISTORY);
    return SEED_HISTORY;
  } catch (e) {
    return SEED_HISTORY;
  }
}

export function saveStudyHistory(historyList) {
  try {
    // Keep max 150 items to keep storage lightweight
    const capped = historyList.slice(0, 150);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(capped));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('learnnova_history_updated', { detail: capped }));
    }
  } catch (e) {
    console.error("Failed to persist study history:", e);
  }
}

export function saveStudyActivity(activity) {
  try {
    const current = getStudyHistory();
    const entry = {
      id: activity.id || `hist-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: activity.timestamp || new Date().toISOString(),
      ...activity
    };
    const updated = [entry, ...current];
    saveStudyHistory(updated);
    return updated;
  } catch (e) {
    console.error("Failed to log study activity:", e);
    return [];
  }
}

export function deleteStudyActivity(activityId) {
  try {
    const current = getStudyHistory();
    const filtered = current.filter(item => item.id !== activityId);
    saveStudyHistory(filtered);
    return filtered;
  } catch (e) {
    return [];
  }
}

export function clearStudyHistory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('learnnova_history_updated', { detail: [] }));
    }
  } catch (e) {}
}

export function subscribeToHistory(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => {
    callback(e.detail || getStudyHistory());
  };
  window.addEventListener('learnnova_history_updated', handler);
  return () => window.removeEventListener('learnnova_history_updated', handler);
}


