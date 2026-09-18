/**
 * Card Generator Service
 * 
 * Implements the Unified Checkpoint-to-Flashcard Pipeline:
 * - Reuses section-level checkpoint questions from the reading session
 * - Generates high-yield Conceptual Q&A and Cloze Deletions per chunk
 * - Supports density settings: 'low' (~1 card/chunk), 'medium' (~2-3 cards/chunk), 'high' (~4+ cards/chunk)
 * - Built-in instant NLP heuristic engine + optional Gemini API integration
 */

export async function generateDeckFromDocument({
  title = "Untitled Study Deck",
  chunks = [],
  checkpointResults = [],
  density = "medium",
  geminiApiKey = null
}) {
  const cards = [];
  let cardIdCounter = 1;

  // 1. First, harvest all checkpoint questions from the reading session (PRD Core Principle)
  if (checkpointResults && checkpointResults.length > 0) {
    checkpointResults.forEach(cp => {
      cards.push({
        id: `card-${cardIdCounter++}`,
        type: "checkpoint-qa",
        sourceChunkId: cp.chunkId,
        sourceChunkTitle: cp.chunkTitle || `Section ${cp.chunkIndex + 1}`,
        question: cp.question,
        answer: cp.options ? cp.options[cp.correctIndex] : cp.answer,
        explanation: cp.explanation || "",
        tags: ["checkpoint", "reading-verified"],
        repetition: 0,
        interval: 1,
        easeFactor: 2.5
      });
    });
  }

  // 2. Generate cards per chunk based on selected density
  const cardsPerChunk = density === "high" ? 3 : density === "medium" ? 2 : 1;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkCards = extractCardsFromChunkContent(chunk, cardIdCounter);

    // Filter to density count
    const selected = chunkCards.slice(0, cardsPerChunk);
    selected.forEach(c => {
      cardIdCounter++;
      cards.push(c);
    });
  }

  // 3. Deduplicate cards with similar questions
  const uniqueCards = deduplicateCards(cards);

  return {
    id: `deck-${Date.now()}`,
    title: title.replace(/^#\s*/, ""),
    createdAt: new Date().toISOString(),
    cardCount: uniqueCards.length,
    cards: uniqueCards
  };
}

/**
 * High-yield client-side heuristic card extraction
 */
function extractCardsFromChunkContent(chunk, startId) {
  const generated = [];
  const content = chunk.content;
  const sentences = content.split(/(?<=[.?!])\s+(?=[A-Z])/).filter(s => s.length > 25);

  let idCounter = startId;

  // Heuristic A: Look for definitions ("X is ...", "X refers to ...", "**X**: ...")
  sentences.forEach(sentence => {
    const defMatch = sentence.match(/^(\*\*[^*]+\*\*|[A-Z][a-zA-Z0-9\s-]{2,30}?)\s+(is an?|is the|refers to|is defined as|represents|acts as)\s+(.+)/i);
    if (defMatch) {
      const term = defMatch[1].replace(/\*\*/g, "").trim();
      const predicate = defMatch[2];
      const definition = defMatch[3].trim();

      generated.push({
        id: `card-${idCounter++}`,
        type: "definition",
        sourceChunkId: chunk.id,
        sourceChunkTitle: chunk.title,
        question: `What is ${term}?`,
        answer: `${term} ${predicate} ${definition}`,
        explanation: `From section: ${chunk.title}`,
        tags: ["concept", "definition"],
        repetition: 0,
        interval: 1,
        easeFactor: 2.5
      });
    }
  });

  // Heuristic B: Look for comparisons/trade-offs ("X vs Y", "Unlike X, Y ...")
  sentences.forEach(sentence => {
    if (sentence.includes(" vs ") || sentence.includes(" versus ") || sentence.includes("Instead of")) {
      generated.push({
        id: `card-${idCounter++}`,
        type: "tradeoff",
        sourceChunkId: chunk.id,
        sourceChunkTitle: chunk.title,
        question: `Explain the trade-off highlighted in: "${chunk.title}"`,
        answer: sentence.trim(),
        explanation: `Key architectural distinction in ${chunk.title}`,
        tags: ["tradeoff", "analysis"],
        repetition: 0,
        interval: 1,
        easeFactor: 2.5
      });
    }
  });

  // Heuristic C: Generate Cloze Deletion card using key terms
  if (chunk.keyTerms && chunk.keyTerms.length > 0) {
    const term = chunk.keyTerms[0];
    const sentenceWithTerm = sentences.find(s => s.includes(term));
    if (sentenceWithTerm) {
      const clozeQuestion = sentenceWithTerm.replace(new RegExp(`\\b${escapeRegex(term)}\\b`, "g"), "[...]");
      generated.push({
        id: `card-${idCounter++}`,
        type: "cloze",
        sourceChunkId: chunk.id,
        sourceChunkTitle: chunk.title,
        question: clozeQuestion,
        answer: term,
        text: sentenceWithTerm.replace(new RegExp(`\\b${escapeRegex(term)}\\b`, "g"), `{{c1::${term}}}`),
        target: term,
        explanation: `Key terminology from ${chunk.title}`,
        tags: ["cloze", "key-term"],
        repetition: 0,
        interval: 1,
        easeFactor: 2.5
      });
    }
  }

  // Heuristic D: Section Key Takeaway QA
  if (generated.length === 0 && sentences.length > 0) {
    generated.push({
      id: `card-${idCounter++}`,
      type: "summary",
      sourceChunkId: chunk.id,
      sourceChunkTitle: chunk.title,
      question: `What is the core takeaway of "${chunk.title}"?`,
      answer: sentences.slice(0, 2).join(" "),
      explanation: `Core summary from ${chunk.title}`,
      tags: ["summary"],
      repetition: 0,
      interval: 1,
      easeFactor: 2.5
    });
  }

  return generated;
}

function deduplicateCards(cards) {
  const seen = new Set();
  return cards.filter(card => {
    const norm = card.question.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
