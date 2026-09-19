/**
 * cardGeneratorService.js
 * 
 * Multi-Algorithm Flashcard Generation Engine:
 * - Strategy 1: Syntactic Rule-Based Extraction (Definitions, Trade-offs, Taxonomies)
 * - Strategy 2: TF-IDF Salience & Information Density Scoring (Key factual statements)
 * - Strategy 3: Multi-perspective Cloze Deletions
 * - Strategy 4: LLM Bloom's Taxonomy Generation (when Gemini API key is provided)
 * - Compatible with both SM-2 and FSRS algorithms
 */

import { initFsrsCard } from './fsrsService';

/**
 * Stop words for TF-IDF keyword extraction
 */
const STOP_WORDS = new Set([
  'a','about','above','after','again','against','all','am','an','and','any','are','aren\'t',
  'as','at','be','because','been','before','being','below','between','both','but','by','can',
  'cannot','could','did','do','does','doing','down','during','each','few','for','from','further',
  'had','has','have','having','he','her','here','hers','herself','him','himself','his','how',
  'i','if','in','into','is','it','its','itself','me','more','most','my','myself','no','nor',
  'not','of','off','on','once','only','or','other','ought','our','ours','ourselves','out','over',
  'own','same','she','should','so','some','such','than','that','the','their','theirs','them',
  'themselves','then','there','these','they','this','those','through','to','too','under','until',
  'up','very','was','wasn\'t','we','were','weren\'t','what','when','where','which','while','who',
  'whom','why','with','would','you','your','yours','yourself','yourselves'
]);

/**
 * Calculates TF-IDF salience scores for sentences across chunks
 */
function calculateSentenceSalience(sentences, allSentences) {
  // Term frequencies
  const docTermFreq = new Map();
  allSentences.forEach(s => {
    const words = new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w)));
    words.forEach(w => docTermFreq.set(w, (docTermFreq.get(w) || 0) + 1));
  });

  const totalDocs = Math.max(1, allSentences.length);

  return sentences.map(sentence => {
    const words = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
    let score = 0;
    words.forEach(w => {
      const df = docTermFreq.get(w) || 1;
      const idf = Math.log(totalDocs / df);
      score += idf;
    });
    // Length normalization
    const normalizedScore = words.length > 0 ? score / Math.sqrt(words.length) : 0;
    return { sentence, score: normalizedScore };
  });
}

/**
 * Generates cards using the Gemini API with Bloom's Taxonomy prompt
 */
async function generateCardsWithGemini(chunks, count, apiKey) {
  const context = chunks.map(c => `[Section: ${c.title}]\n${c.content.slice(0, 800)}`).join('\n\n');
  const prompt = `You are an expert cognitive learning scientist. Generate ${count} high-yield flashcards from this academic text using Bloom's Taxonomy (Understanding, Application, Analysis).

Return ONLY a valid JSON array of objects with fields:
- "question": string (Clear, specific question, no yes/no questions)
- "answer": string (Precise, punchy answer)
- "explanation": string (1-2 sentence context or rationale)
- "type": "concept" | "tradeoff" | "application"
- "tag": string

TEXT:
${context}

JSON:`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1200,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (response.ok) {
      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.warn("Gemini card generation fallback to heuristics:", err);
  }
  return [];
}

/**
 * Main Card Deck Generation Pipeline
 */
export async function generateDeckFromDocument({
  title = "Untitled Study Deck",
  chunks = [],
  checkpointResults = [],
  density = "medium",
  geminiApiKey = null,
  algorithm = "sm2"
}) {
  const cards = [];
  let cardIdCounter = 1;

  // 1. Harvest verified checkpoint questions from reading session
  if (checkpointResults && checkpointResults.length > 0) {
    checkpointResults.forEach(cp => {
      const baseCard = {
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
      };
      cards.push(algorithm === 'fsrs' ? initFsrsCard(baseCard) : baseCard);
    });
  }

  // 2. Try Gemini API first if key provided
  const targetCardsPerChunk = density === "high" ? 3 : density === "medium" ? 2 : 1;
  const totalNeeded = chunks.length * targetCardsPerChunk;

  if (geminiApiKey) {
    const aiCards = await generateCardsWithGemini(chunks, totalNeeded, geminiApiKey);
    if (aiCards.length > 0) {
      aiCards.forEach(c => {
        const baseCard = {
          id: `card-${cardIdCounter++}`,
          type: c.type || "concept",
          sourceChunkTitle: title,
          question: c.question,
          answer: c.answer,
          explanation: c.explanation || "",
          tags: ["ai-generated", c.tag || "bloom-taxonomy"],
          repetition: 0,
          interval: 1,
          easeFactor: 2.5
        };
        cards.push(algorithm === 'fsrs' ? initFsrsCard(baseCard) : baseCard);
      });
    }
  }

  // 3. Multi-Algorithm Heuristic Extraction (Fallback or Complement)
  if (cards.length < totalNeeded) {
    const allSentences = [];
    chunks.forEach(c => {
      const s = c.content.split(/(?<=[.?!])\s+(?=[A-Z])/).filter(str => str.length > 25);
      allSentences.push(...s);
    });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkCards = extractMultiAlgorithmCards(chunk, allSentences, cardIdCounter, algorithm);
      const selected = chunkCards.slice(0, targetCardsPerChunk);
      selected.forEach(c => {
        cardIdCounter++;
        cards.push(c);
      });
    }
  }

  const uniqueCards = deduplicateCards(cards);

  return {
    id: `deck-${Date.now()}`,
    title: title.replace(/^#\s*/, ""),
    createdAt: new Date().toISOString(),
    cardCount: uniqueCards.length,
    algorithm,
    cards: uniqueCards
  };
}

/**
 * Multi-Algorithm Heuristic Card Extractor
 */
function extractMultiAlgorithmCards(chunk, allSentences, startId, algorithm) {
  const generated = [];
  const content = chunk.content;
  const sentences = content.split(/(?<=[.?!])\s+(?=[A-Z])/).filter(s => s.length > 25);
  let idCounter = startId;

  // Algorithm A: Syntactic Definition Pattern
  sentences.forEach(sentence => {
    const defMatch = sentence.match(/^(\*\*[^*]+\*\*|[A-Z][a-zA-Z0-9\s-]{2,30}?)\s+(is an?|is the|refers to|is defined as|represents|acts as)\s+(.+)/i);
    if (defMatch) {
      const term = defMatch[1].replace(/\*\*/g, "").trim();
      const predicate = defMatch[2];
      const definition = defMatch[3].trim();

      const baseCard = {
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
      };
      generated.push(algorithm === 'fsrs' ? initFsrsCard(baseCard) : baseCard);
    }
  });

  // Algorithm B: Trade-off & Contrast Analysis
  sentences.forEach(sentence => {
    if (sentence.includes(" vs ") || sentence.includes(" versus ") || sentence.includes("Instead of")) {
      const baseCard = {
        id: `card-${idCounter++}`,
        type: "tradeoff",
        sourceChunkId: chunk.id,
        sourceChunkTitle: chunk.title,
        question: `Explain the distinction or trade-off in: "${chunk.title}"`,
        answer: sentence.trim(),
        explanation: `Key architectural trade-off highlighted in ${chunk.title}`,
        tags: ["tradeoff", "analysis"],
        repetition: 0,
        interval: 1,
        easeFactor: 2.5
      };
      generated.push(algorithm === 'fsrs' ? initFsrsCard(baseCard) : baseCard);
    }
  });

  // Algorithm C: TF-IDF Salience Sentence
  if (sentences.length > 0) {
    const scored = calculateSentenceSalience(sentences, allSentences);
    scored.sort((a, b) => b.score - a.score);
    const topSentence = scored[0]?.sentence;
    if (topSentence && !generated.some(c => c.answer.includes(topSentence.slice(0, 30)))) {
      const baseCard = {
        id: `card-${idCounter++}`,
        type: "salience",
        sourceChunkId: chunk.id,
        sourceChunkTitle: chunk.title,
        question: `What is a primary insight regarding "${chunk.title}"?`,
        answer: topSentence,
        explanation: `High-information statement identified via statistical TF-IDF salience.`,
        tags: ["salience", "high-yield"],
        repetition: 0,
        interval: 1,
        easeFactor: 2.5
      };
      generated.push(algorithm === 'fsrs' ? initFsrsCard(baseCard) : baseCard);
    }
  }

  // Algorithm D: Key Term Cloze Deletion
  if (chunk.keyTerms && chunk.keyTerms.length > 0) {
    const term = chunk.keyTerms[0];
    const match = sentences.find(s => s.toLowerCase().includes(term.toLowerCase()));
    if (match) {
      const clozeQuestion = match.replace(new RegExp(`\\b${escapeRegex(term)}\\b`, "gi"), "[...]");
      const baseCard = {
        id: `card-${idCounter++}`,
        type: "cloze",
        sourceChunkId: chunk.id,
        sourceChunkTitle: chunk.title,
        question: clozeQuestion,
        answer: term,
        text: match.replace(new RegExp(`\\b${escapeRegex(term)}\\b`, "gi"), `{{c1::${term}}}`),
        target: term,
        explanation: `Key terminology from ${chunk.title}`,
        tags: ["cloze", "key-term"],
        repetition: 0,
        interval: 1,
        easeFactor: 2.5
      };
      generated.push(algorithm === 'fsrs' ? initFsrsCard(baseCard) : baseCard);
    }
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
