/**
 * Storage Service
 * Manages LocalStorage persistence for decks, reading sessions, and user preferences.
 */

const STORAGE_KEYS = {
  DECKS: "learnnova_decks",
  ACTIVE_SESSION: "learnnova_active_session",
  SETTINGS: "learnnova_settings",
  STATS: "learnnova_user_stats"
};

const DEFAULT_SETTINGS = {
  readingWpm: 200,
  sensitivity: "medium", // 'low' | 'medium' | 'high'
  isAvatarEnabled: true,
  cardDensity: "medium", // 'low' | 'medium' | 'high'
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

