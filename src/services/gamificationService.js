/**
 * gamificationService.js
 * 
 * Implements the Duolingo-inspired Behavioral Habit Engine for LearnNova:
 * - Daily Study Streaks (tracks consecutive active days)
 * - XP Economy (+15 XP reading, +25 XP checkpoints, +5 XP card review)
 * - Level Progression & Titles
 * - Daily Study Goals (e.g. 100 XP / day)
 * - Event-driven reward notification dispatcher
 */

const GAMIFICATION_STORAGE_KEY = "learnnova_gamification";

const DEFAULT_GAMIFICATION = {
  xp: 0,
  level: 1,
  streakDays: 1,
  lastActiveDate: new Date().toISOString().split("T")[0],
  todayXp: 0,
  dailyGoalXp: 100,
  sectionsRead: 0,
  checkpointsCompleted: 0,
  cardsReviewed: 0,
  badges: []
};

// Level curve thresholds
const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0, title: "Novice Reader", nextXp: 100 },
  { level: 2, minXp: 100, title: "Keen Scholar", nextXp: 250 },
  { level: 3, minXp: 250, title: "Deep Thinker", nextXp: 500 },
  { level: 4, minXp: 500, title: "Knowledge Synthesizer", nextXp: 1000 },
  { level: 5, minXp: 1000, title: "Master Polymath", nextXp: 2000 }
];

export function getLevelInfo(totalXp) {
  let current = LEVEL_THRESHOLDS[0];
  for (const threshold of LEVEL_THRESHOLDS) {
    if (totalXp >= threshold.minXp) {
      current = threshold;
    } else {
      break;
    }
  }
  const prevMin = current.minXp;
  const nextTarget = current.nextXp;
  const progressInLevel = totalXp - prevMin;
  const span = nextTarget - prevMin;
  const percent = Math.min(100, Math.round((progressInLevel / span) * 100));

  return {
    level: current.level,
    title: current.title,
    xpInLevel: progressInLevel,
    xpToNext: nextTarget - totalXp,
    percent,
    nextTarget
  };
}

export function loadGamificationState() {
  try {
    const raw = localStorage.getItem(GAMIFICATION_STORAGE_KEY);
    const data = raw ? { ...DEFAULT_GAMIFICATION, ...JSON.parse(raw) } : { ...DEFAULT_GAMIFICATION };

    // Check streak validity based on calendar dates
    const today = new Date().toISOString().split("T")[0];
    const lastActive = data.lastActiveDate;

    if (lastActive !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      if (lastActive === yesterday) {
        // Active yesterday, streak continues when action taken today!
        data.todayXp = 0;
      } else {
        // Missed a day: reset streak to 1
        data.streakDays = 1;
        data.todayXp = 0;
      }
      data.lastActiveDate = today;
      saveGamificationState(data);
    }

    return data;
  } catch (e) {
    return { ...DEFAULT_GAMIFICATION };
  }
}

export function saveGamificationState(state) {
  try {
    localStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save gamification state", e);
  }
}

// Global listener for reward animations
const listeners = new Set();

export function subscribeToRewards(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyReward(reward) {
  listeners.forEach(cb => {
    try { cb(reward); } catch (e) {}
  });
}

/**
 * Awards XP and updates streaks, triggering reward animations.
 * @param {string} action - 'section_read' | 'checkpoint_correct' | 'card_review' | 'session_complete'
 * @param {number} customAmount - optional XP override
 * @param {string} label - visual message displayed on floating pill
 */
export function awardXp(action, customAmount = null, label = "") {
  const state = loadGamificationState();
  const today = new Date().toISOString().split("T")[0];

  let amount = customAmount;
  let reason = label;

  switch (action) {
    case "section_read":
      amount = amount || 15;
      reason = reason || "+15 XP Section Completed!";
      state.sectionsRead = (state.sectionsRead || 0) + 1;
      break;
    case "checkpoint_correct":
      amount = amount || 25;
      reason = reason || "+25 XP Checkpoint Mastered!";
      state.checkpointsCompleted = (state.checkpointsCompleted || 0) + 1;
      break;
    case "card_review":
      amount = amount || 5;
      reason = reason || "+5 XP Card Recalled!";
      state.cardsReviewed = (state.cardsReviewed || 0) + 1;
      break;
    case "streak_bonus":
      amount = amount || 30;
      reason = reason || "+30 XP Daily Streak Bonus!";
      break;
    default:
      amount = amount || 10;
      reason = reason || `+${amount} XP!`;
  }

  const oldLevel = getLevelInfo(state.xp).level;
  state.xp += amount;
  state.todayXp = (state.todayXp || 0) + amount;
  state.lastActiveDate = today;

  const newLevelInfo = getLevelInfo(state.xp);
  const leveledUp = newLevelInfo.level > oldLevel;

  saveGamificationState(state);

  // Dispatch UI notification
  notifyReward({
    id: Date.now() + Math.random(),
    amount,
    reason,
    totalXp: state.xp,
    todayXp: state.todayXp,
    streakDays: state.streakDays,
    leveledUp,
    levelInfo: newLevelInfo
  });

  return { state, leveledUp, levelInfo: newLevelInfo };
}
