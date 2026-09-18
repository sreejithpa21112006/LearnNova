/**
 * tutorService.js
 * 
 * Handles answering user questions about the document.
 * - Offline NLP mode: keyword-search over chunk content, returns quoted passages
 * - Gemini API mode: sends context + question to gemini-1.5-flash
 */

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should','may',
  'might','shall','can','need','dare','ought','used','to','of','in','on',
  'at','by','for','with','about','against','between','into','through',
  'during','before','after','above','below','from','up','down','out',
  'off','over','under','then','than','so','and','but','or','nor','if',
  'while','as','when','where','why','how','what','which','who','whom',
  'this','that','these','those','it','its','i','you','he','she','we','they',
  'me','him','her','us','them','my','your','his','our','their','not','no',
  'very','just','also','more','most','other','some','such','only','own',
  'same','too','both','each','few','more','other','some','any'
]);

/**
 * Extracts meaningful keywords from a query string
 */
function extractKeywords(query) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Scores a sentence by how many query keywords it contains
 */
function scoreSentence(sentence, keywords) {
  const lower = sentence.toLowerCase();
  return keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
}

/**
 * Splits text into clean sentences
 */
function splitSentences(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/`[^`]+`/g, match => match.replace(/\s/g, '_'))
    .split(/(?<=[.?!])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 30);
}

/**
 * Offline NLP answer: finds the most relevant sentences in document chunks
 */
export function answerWithNLP(question, chunks, activeChunkIndex) {
  const keywords = extractKeywords(question);
  if (keywords.length === 0) {
    return "Could you rephrase your question? I want to make sure I find the right part of the document for you.";
  }

  const candidates = [];

  // Search active chunk first (highest weight), then neighbours, then all
  const searchOrder = [
    activeChunkIndex,
    activeChunkIndex - 1,
    activeChunkIndex + 1,
    ...chunks.map((_, i) => i).filter(i =>
      i !== activeChunkIndex && i !== activeChunkIndex - 1 && i !== activeChunkIndex + 1
    )
  ].filter(i => i >= 0 && i < chunks.length);

  for (const idx of searchOrder) {
    const chunk = chunks[idx];
    if (!chunk) continue;
    const sentences = splitSentences(chunk.content);
    for (const sentence of sentences) {
      const score = scoreSentence(sentence, keywords);
      if (score > 0) {
        candidates.push({ sentence, score, chunkTitle: chunk.title, chunkIdx: idx });
      }
    }
  }

  if (candidates.length === 0) {
    return `I searched through all ${chunks.length} sections of the document but couldn't find anything directly about "${question.trim()}". Try rephrasing or asking about a specific term from the text.`;
  }

  // Sort by score descending, then take top 2-3 unique sentences
  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, 3);
  const sourceTitle = top[0].chunkTitle;

  // Build response
  const isActiveChunk = top[0].chunkIdx === activeChunkIndex;
  const locationNote = isActiveChunk
    ? "Right in the section you're reading"
    : `From "${sourceTitle}"`;

  const answer = top.map(c => c.sentence).join(' ');

  return `${locationNote}:\n\n"${answer}"`;
}

/**
 * Gemini API answer: sends context + question, returns streamed text
 */
export async function answerWithGemini(question, chunks, activeChunkIndex, apiKey) {
  // Build a context window: active chunk + 1 neighbour before and after
  const contextChunks = [
    chunks[activeChunkIndex - 1],
    chunks[activeChunkIndex],
    chunks[activeChunkIndex + 1]
  ].filter(Boolean);

  const context = contextChunks
    .map(c => `[Section: ${c.title}]\n${c.content}`)
    .join('\n\n---\n\n');

  const prompt = `You are a concise, helpful AI tutor embedded in a reading assistant app called LearnNova. The student is reading a document and has asked you a question.

Your job is to answer their question using ONLY the document excerpts provided below. Be direct and educational. Keep your answer under 4 sentences unless the question requires detail. Do not make up information not present in the excerpts.

--- DOCUMENT EXCERPTS ---
${context}
--- END EXCERPTS ---

Student question: ${question}

Answer:`;

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
            maxOutputTokens: 400
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    return text.trim();
  } catch (err) {
    console.warn('Gemini failed, falling back to NLP:', err.message);
    return answerWithNLP(question, chunks, activeChunkIndex);
  }
}

/**
 * Smart checkpoint question generator from chunk content
 * Returns { question, options, correctIndex, explanation }
 */
export function generateSmartCheckpoint(chunk) {
  const content = chunk.content;
  const sentences = splitSentences(content);
  const keywords = chunk.keyTerms || [];

  // Strategy 1: Find a definition sentence "X is Y" — ask "What is X?"
  for (const sentence of sentences) {
    const defMatch = sentence.match(
      /^(\*\*[^*]+\*\*|[A-Z][a-zA-Z0-9\s\-]{2,35}?)\s+(is an?|is the|refers to|is defined as|represents|enables)\s+(.{20,120})/i
    );
    if (defMatch) {
      const term = defMatch[1].replace(/\*\*/g, '').trim();
      const predicate = defMatch[2];
      const definition = defMatch[3].replace(/\.$/, '').trim();
      const correct = `${definition}`;

      const distractors = buildDistractors(sentences, correct, keywords);
      const options = shuffle([correct, ...distractors.slice(0, 3)]);
      const correctIndex = options.indexOf(correct);

      return {
        question: `What ${predicate} ${term}?`,
        options,
        correctIndex,
        explanation: `From "${chunk.title}": ${sentence.trim()}`
      };
    }
  }

  // Strategy 2: Find a "how/why" sentence with a key term
  if (keywords.length > 0) {
    const term = keywords[0];
    const termSentence = sentences.find(s =>
      s.toLowerCase().includes(term.toLowerCase()) && s.length > 40
    );
    if (termSentence) {
      const correct = termSentence.trim();
      const distractors = buildDistractors(sentences, correct, keywords);
      const options = shuffle([correct, ...distractors.slice(0, 3)]);
      const correctIndex = options.indexOf(correct);
      return {
        question: `Which of the following accurately describes the role of ${term} in this section?`,
        options,
        correctIndex,
        explanation: `From "${chunk.title}": This statement directly describes how ${term} functions as discussed in the text.`
      };
    }
  }

  // Strategy 3: Key sentence from middle of content
  const midSentence = sentences[Math.floor(sentences.length / 2)] || sentences[0];
  if (midSentence) {
    const correct = midSentence.trim();
    const distractors = buildDistractors(sentences, correct, keywords);
    const options = shuffle([correct, ...distractors.slice(0, 3)]);
    const correctIndex = options.indexOf(correct);
    return {
      question: `Which statement is supported by the content of "${chunk.title}"?`,
      options,
      correctIndex,
      explanation: `This statement is drawn directly from the text of "${chunk.title}".`
    };
  }

  // Final fallback — generic but still uses key terms
  const primaryTerm = keywords[0] || chunk.title;
  return {
    question: `What is the significance of ${primaryTerm} as described in this section?`,
    options: [
      `${primaryTerm} plays a central role in the mechanism described in this section.`,
      `${primaryTerm} is an optional component that can be bypassed under normal conditions.`,
      `${primaryTerm} was deprecated in favour of simpler alternatives.`,
      `${primaryTerm} only applies to special edge cases with no general relevance.`
    ],
    correctIndex: 0,
    explanation: `The section "${chunk.title}" specifically focuses on the role and importance of ${primaryTerm}.`
  };
}

/**
 * Generates plausible-sounding but incorrect distractors from other sentences in the chunk
 */
function buildDistractors(sentences, correctText, keywords) {
  // Use other sentences from the chunk as distractors (they're related but not the right answer)
  const others = sentences
    .filter(s => s !== correctText && s.length > 30)
    .slice(0, 3);

  if (others.length >= 3) return others;

  // Pad with safe generic distractors if not enough sentences
  const pads = [
    'This concept applies exclusively in distributed systems with more than 100 nodes.',
    'The mechanism is designed to bypass standard memory safety checks for performance.',
    'This feature requires a centralised coordinator to function correctly.',
    'It is only relevant when the system operates below its minimum throughput threshold.'
  ];
  return [...others, ...pads].slice(0, 3);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
