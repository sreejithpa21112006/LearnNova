/**
 * fsrsService.js
 * 
 * Implements the Free Spaced Repetition Scheduler (FSRS) memory model.
 * In FSRS:
 * - Stability (S): Days until retrievability drops to 90%.
 * - Difficulty (D): Inherent difficulty of the item (1 to 10 scale).
 * - Retrievability (R): Probability of successful recall at elapsed time t: R(t) = (1 + factor * t / S)^decay.
 * 
 * Grades (0 to 5, or 1=Again, 2=Hard, 3=Good, 4=Easy):
 * - Rating 1 (Again): Recall failure
 * - Rating 2 (Hard): Difficult recall
 * - Rating 3 (Good): Standard recall
 * - Rating 4 (Easy): Effortless recall
 */

// Default FSRS parameters (tuned for student academic retention)
const FSRS_DEFAULTS = {
  requestRetention: 0.90, // Target retrievability: 90%
  w: [
    0.40255, 1.18385, 3.173, 15.69105, // Initial stabilities for ratings 1, 2, 3, 4
    7.1949, 0.5345, 1.4604, 0.0046,     // Difficulty parameters
    1.5457, 0.1192, 1.0192,             // Stability update parameters on recall
    1.9395, 0.11, 0.296, 2.2698         // Stability update parameters on lapse
  ]
};

/**
 * Calculates Retrievability R at elapsed days t given stability S
 */
export function calculateRetrievability(elapsedDays, stability) {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1.0;
  const factor = 19 / 81;
  return Math.pow(1 + factor * (elapsedDays / stability), -0.5);
}

/**
 * Initializes a new card's FSRS state
 */
export function initFsrsCard(card = {}) {
  return {
    ...card,
    fsrs: {
      stability: 0,
      difficulty: 5.0,
      reps: 0,
      lapses: 0,
      state: 'new',
      lastReviewedAt: null,
      due: new Date().toISOString()
    }
  };
}

/**
 * Updates a card using the FSRS algorithm
 * @param {Object} card 
 * @param {number} grade - User grade (0-5 scale or 1-4 scale)
 * @returns {Object} Updated card
 */
export function calculateFSRS(card, grade) {
  const now = new Date();
  const fsrsState = card.fsrs || {
    stability: card.easeFactor ? card.interval || 1 : 0,
    difficulty: 5.0,
    reps: card.repetition || 0,
    lapses: 0,
    state: (card.repetition > 0) ? 'review' : 'new',
    lastReviewedAt: card.lastReviewedDate || null
  };

  let rating;
  if (grade <= 1) rating = 1;
  else if (grade === 2) rating = 2;
  else if (grade <= 4) rating = 3;
  else rating = 4;

  let { stability, difficulty, reps, lapses, state, lastReviewedAt } = fsrsState;
  const w = FSRS_DEFAULTS.w;

  let elapsedDays = 0;
  if (lastReviewedAt) {
    const prevDate = new Date(lastReviewedAt);
    elapsedDays = Math.max(0, (now.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const retrievability = stability > 0 ? calculateRetrievability(elapsedDays, stability) : 0;

  if (state === 'new') {
    stability = Math.max(0.1, w[rating - 1]);
    difficulty = Math.min(10, Math.max(1, w[4] - Math.exp(w[5] * (rating - 1)) + 1));
    state = rating === 1 ? 'learning' : 'review';
  } else {
    const deltaD = -w[6] * (rating - 3);
    const meanReversion = 0.05 * (5.0 - difficulty);
    difficulty = Math.min(10, Math.max(1, difficulty + deltaD + meanReversion));

    if (rating === 1) {
      lapses += 1;
      state = 'relearning';
      stability = Math.max(0.1, w[11] * Math.pow(difficulty, -w[12]) * (Math.pow(stability + 1, w[13]) - 1) * Math.exp(w[14] * (1 - retrievability)));
    } else {
      state = 'review';
      const hardPenalty = rating === 2 ? 0.8 : 1.0;
      const easyBonus = rating === 4 ? 1.3 : 1.0;
      const factor = Math.exp(w[8]) * (11 - difficulty) * Math.pow(Math.max(0.1, stability), -w[9]) * (Math.exp(w[10] * (1 - retrievability)) - 1);
      stability = Math.max(stability + 0.1, stability * (1 + factor * hardPenalty * easyBonus));
    }
  }

  reps += 1;

  const targetR = FSRS_DEFAULTS.requestRetention;
  let nextIntervalDays = Math.max(1, Math.round(stability * ((1 / targetR) - 1) * 9));
  if (rating === 1) nextIntervalDays = 1;

  const nextDueDate = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);

  return {
    ...card,
    algorithm: 'fsrs',
    repetition: reps,
    interval: nextIntervalDays,
    lastReviewedDate: now.toISOString(),
    nextReviewDate: nextDueDate.toISOString(),
    reviewCount: (card.reviewCount || 0) + 1,
    fsrs: {
      stability: Number(stability.toFixed(2)),
      difficulty: Number(difficulty.toFixed(2)),
      retrievability: Number(retrievability.toFixed(2)),
      reps,
      lapses,
      state,
      lastReviewedAt: now.toISOString(),
      due: nextDueDate.toISOString()
    },
    history: [
      ...(card.history || []),
      {
        date: now.toISOString(),
        grade,
        rating,
        interval: nextIntervalDays,
        stability: Number(stability.toFixed(2)),
        difficulty: Number(difficulty.toFixed(2)),
        algorithm: 'fsrs'
      }
    ]
  };
}
