/**
 * SuperMemo SM-2 Spaced Repetition Algorithm & Deck Analytics
 */

/**
 * Calculates updated SM-2 scheduling parameters given a user grade (0-5)
 * @param {Object} card
 * @param {number} grade 0: Blackout, 1: Wrong, 2: Hard wrong, 3: Hard pass, 4: Good, 5: Easy
 * @returns {Object} Updated card fields
 */
export function calculateSM2(card, grade) {
  let {
    repetition = 0,
    interval = 1,
    easeFactor = 2.5
  } = card;

  // Grade must be integer 0 to 5
  const q = Math.max(0, Math.min(5, Math.round(grade)));

  if (q >= 3) {
    // Successful recall
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  } else {
    // Failed recall: reset repetition count and schedule for tomorrow/review immediately
    repetition = 0;
    interval = 1;
  }

  // Update Ease Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const deltaEF = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  easeFactor = Math.max(1.3, Number((easeFactor + deltaEF).toFixed(2)));

  const now = new Date();
  const nextDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  const reviewEntry = {
    date: now.toISOString(),
    grade: q,
    interval,
    easeFactor
  };

  return {
    ...card,
    repetition,
    interval,
    easeFactor,
    lastReviewedDate: now.toISOString(),
    nextReviewDate: nextDate.toISOString(),
    reviewCount: (card.reviewCount || 0) + 1,
    history: [...(card.history || []), reviewEntry]
  };
}

/**
 * Checks if a card is currently due for review
 */
export function isCardDue(card) {
  if (!card.nextReviewDate) return true; // Brand new card
  const dueDate = new Date(card.nextReviewDate);
  return dueDate <= new Date();
}

/**
 * Computes deck metrics for dashboard and deck listings
 */
export function getDeckStats(cards = []) {
  if (!cards || cards.length === 0) {
    return {
      total: 0,
      due: 0,
      learning: 0,
      mastered: 0,
      retentionRate: 0
    };
  }

  let due = 0;
  let learning = 0;
  let mastered = 0;
  let totalSuccessfulReviews = 0;
  let totalReviews = 0;

  cards.forEach(card => {
    if (isCardDue(card)) due++;
    
    const rep = card.repetition || 0;
    if (rep >= 3) mastered++;
    else learning++;

    if (card.history && card.history.length > 0) {
      card.history.forEach(h => {
        totalReviews++;
        if (h.grade >= 3) totalSuccessfulReviews++;
      });
    }
  });

  const retentionRate = totalReviews > 0 
    ? Math.round((totalSuccessfulReviews / totalReviews) * 100) 
    : 100;

  return {
    total: cards.length,
    due,
    learning,
    mastered,
    retentionRate
  };
}

/**
 * Formats a deck into Anki-compatible TSV format (Front \t Back \t Tags)
 */
export function exportToAnkiTsv(deck) {
  if (!deck || !deck.cards) return "";

  const lines = [
    "#separator:tab",
    "#html:true",
    "#tags column:3"
  ];

  deck.cards.forEach(card => {
    let front = card.question;
    let back = card.answer;

    if (card.type === "cloze") {
      // In cloze cards, front has {{c1::word}} or [...]
      front = card.text || card.question;
      back = `<b>Target:</b> ${card.target || card.answer}<br/><small>${card.explanation || ''}</small>`;
    } else {
      if (card.explanation) {
        back += `<br/><br/><i>${card.explanation}</i>`;
      }
    }

    // Escape tabs and newlines
    const safeFront = front.replace(/\t/g, " ").replace(/\n/g, "<br>");
    const safeBack = back.replace(/\t/g, " ").replace(/\n/g, "<br>");
    const tags = (card.tags || ["study-copilot", deck.title.replace(/\s+/g, "_")]).join(" ");

    lines.push(`${safeFront}\t${safeBack}\t${tags}`);
  });

  return lines.join("\n");
}

/**
 * Triggers a direct browser file download for Anki TSV or JSON export
 */
export function downloadFile(content, filename, contentType = "text/plain;charset=utf-8;") {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
