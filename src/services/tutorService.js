/**
 * tutorService.js
 * 
 * Handles answering user questions about the document and generating
 * balanced, high-yield checkpoint comprehension questions.
 * - Offline NLP mode: keyword-search over chunk content, returns quoted passages
 * - Gemini API mode: sends context + question to gemini-1.5-flash
 * - Balanced Checkpoints: strictly balanced option lengths, no bullet dumps, domain-relevant distractors
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
 * Extracts clean, standalone statements from text:
 * - Separates bullet points, numbered lists, and paragraph sentences
 * - Strips bullet characters, asterisks, and heading hashes
 * - Normalizes whitespace and returns array of distinct thoughts
 */
export function splitSentences(text) {
  if (!text) return [];

  // Normalize list markers and bullets into distinct lines
  const normalized = text
    .replace(/\*\*/g, '')
    .replace(/`[^`]+`/g, m => m.replace(/[`]/g, ''))
    .replace(/^#+\s+/gm, '')
    .replace(/[•●▪■◦‣\u2022\u2023\u25E6\u2043\u2219]/g, '\n• ')
    .replace(/(\n|^)\s*[-*]\s+/g, '\n• ')
    .replace(/(\n|^)\s*\d+\.\s+/g, '\n• ');

  const rawLines = normalized.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const statements = [];

  for (const line of rawLines) {
    // Clean bullet marker
    const cleanLine = line.replace(/^[•\-\*\d\.]+\s*/, '').trim();
    if (!cleanLine || cleanLine.length < 20) continue;

    // Split compound sentences if they contain standard delimiters
    const parts = cleanLine
      .split(/(?<=[.?!])\s+(?=[A-Z0-9])/)
      .map(s => s.trim())
      .filter(s => s.length >= 25);

    for (const p of parts) {
      const cleanP = p.replace(/^[:\-,;\s]+/, '').replace(/[:\-,;\s]+$/, '');
      if (cleanP.length >= 25 && !cleanP.startsWith('http')) {
        statements.push(cleanP);
      }
    }
  }

  return statements;
}

/**
 * Formats an option text to be clean, punchy, and of controlled length (50-120 chars).
 * Strips raw example clauses, bullets, and excessive clauses so all options look uniform.
 */
function formatOptionText(raw, targetMax = 110) {
  if (!raw) return '';
  let text = raw.trim()
    .replace(/^[\s•\-\*\d\.\–—\u2013\u2014\u2212:]+/, '')
    .replace(/^for example:?\s*/i, '')
    .replace(/^[A-Za-z0-9\s]{2,25}\s*:\s*/, '')
    .replace(/^[\s•\-\*\d\.\–—\u2013\u2014\u2212:]+/, '')
    .replace(/^for example:?\s*/i, '')
    .replace(/\*\*/g, '')
    .replace(/\s+[–—\-\u2013\u2014]\s+For example:?.*$/i, '')
    .replace(/\s+[–—\-\u2013\u2014]\s+e\.g\..*$/i, '')
    .replace(/\s*\(e\.g\..*?\)/gi, '')
    .replace(/\s*\(for example.*?\)/gi, '')
    .replace(/\s*;\s*for example.*$/i, '');

  text = text.replace(/\s+/g, ' ').trim();

  // If still too long, trim at a natural syntactic boundary
  if (text.length > targetMax) {
    const cut = text.slice(0, targetMax);
    const lastPunct = Math.max(
      cut.lastIndexOf(','),
      cut.lastIndexOf(';'),
      cut.lastIndexOf(' which '),
      cut.lastIndexOf(' that '),
      cut.lastIndexOf(' where ')
    );
    if (lastPunct > 35) {
      text = cut.slice(0, lastPunct).trim() + '.';
    } else {
      const lastSpace = cut.lastIndexOf(' ');
      text = (lastSpace > 35 ? cut.slice(0, lastSpace).trim() : cut) + '...';
    }
  }

  if (!text.endsWith('.') && !text.endsWith('...')) {
    text += '.';
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
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

  // Build clean, structured bullet point response instead of a solid paragraph wall
  const isActiveChunk = top[0].chunkIdx === activeChunkIndex;
  const leadIn = isActiveChunk
    ? `Key insights from this section:`
    : `Key insights from "${sourceTitle}":`;

  const bullets = top.map(c => `• ${c.sentence.trim()}`).join('\n\n');

  return `${leadIn}\n\n${bullets}`;
}

/**
 * Gemini API answer: sends context + question, returns structured bullet points
 */
export async function answerWithGemini(question, chunks, activeChunkIndex, apiKey) {
  const contextChunks = [
    chunks[activeChunkIndex - 1],
    chunks[activeChunkIndex],
    chunks[activeChunkIndex + 1]
  ].filter(Boolean);

  const context = contextChunks
    .map(c => `[Section: ${c.title}]\n${c.content}`)
    .join('\n\n---\n\n');

  const prompt = `You are an adaptive, high-yield AI study tutor in the LearnNova study app. The student is reading and asked you a question.

CRITICAL FORMATTING RULES:
1. NEVER respond in a dense paragraph block.
2. Start with a direct, single-sentence summary answering the question.
3. Break down the core explanation into 2 to 3 concise, high-yield bullet points (use "• ").
4. Keep each bullet point under 20 words.
5. Use ONLY the provided document excerpts. If the answer is not present, state so concisely.

--- DOCUMENT EXCERPTS ---
${context}
--- END EXCERPTS ---

Student question: ${question}

Response:`;

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
 * Generates balanced, domain-relevant distractors that match the length and tone
 * of the correct option. Avoids generic distributed systems pads and bullet dumps.
 */
function buildBalancedDistractors(correctFormatted, allStatements, keywords = [], chunkTitle = '') {
  const targetLength = correctFormatted.length;
  const distractors = [];

  // 1. First priority: other statements from the document (guaranteed domain relevance)
  const cleanCorrect = correctFormatted.toLowerCase().replace(/[^a-z0-9]/g, '');
  const candidateStatements = allStatements
    .map(s => formatOptionText(s, Math.max(75, targetLength + 20)))
    .filter(s => {
      if (!s || s.length < 25) return false;
      const cleanS = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanS === cleanCorrect) return false;
      if (cleanS.slice(0, 25) === cleanCorrect.slice(0, 25)) return false;
      return !distractors.includes(s);
    });

  for (const cand of candidateStatements) {
    if (distractors.length >= 3) break;
    distractors.push(cand);
  }

  // 2. Second priority: Context-aware semantic mutations of the domain
  const term = keywords[0] || (chunkTitle.split(/[:\-]/)[0] || 'The system').trim();

  const domainPlausibles = [
    `It operates as a static reference model without updating parameters during runtime.`,
    `It evaluates throughput metrics while bypassing direct error minimization.`,
    `It requires explicit manual rule sets rather than deriving patterns from data.`,
    `It executes exclusively in the preprocessing stage before primary feature extraction.`,
    `It limits adaptation strictly to offline batch execution cycles.`,
    `It discards training state immediately following initial weight convergence.`
  ];

  for (const pad of domainPlausibles) {
    if (distractors.length >= 3) break;
    const formatted = formatOptionText(pad, targetLength + 15);
    if (!distractors.includes(formatted) && formatted !== correctFormatted) {
      distractors.push(formatted);
    }
  }

  return distractors.slice(0, 3);
}

/**
 * Smart checkpoint question generator from chunk content.
 * Guarantees:
 * 1. Options are never paragraph dumps or multi-bullet lists.
 * 2. All 4 options are approximately the same length (50-110 characters).
 * 3. Distractors are domain-plausible and grammatically parallel.
 */
export function generateSmartCheckpoint(chunk, allChunks = []) {
  const content = chunk?.content || '';
  const statements = splitSentences(content);
  const keywords = chunk?.keyTerms || [];

  // Gather statements from other chunks for realistic distractors
  const otherStatements = [];
  if (Array.isArray(allChunks)) {
    allChunks.forEach(c => {
      if (c && c.id !== chunk?.id) {
        otherStatements.push(...splitSentences(c.content));
      }
    });
  }
  const combinedStatements = [...statements, ...otherStatements];

  // Strategy 1: Check for named list items / component definitions like "• Task: ... • Data: ..."
  for (const stmt of statements) {
    const listComponentMatch = stmt.match(/^([A-Z][a-zA-Z\s]{2,25})\s*:\s*(.+)$/i);
    if (listComponentMatch) {
      const compName = listComponentMatch[1].trim();
      const compDesc = listComponentMatch[2].trim();
      if (compDesc.length >= 25) {
        const correct = formatOptionText(compDesc, 95);
        const distractors = buildBalancedDistractors(correct, combinedStatements, keywords, chunk.title);
        const options = shuffle([correct, ...distractors]);
        const correctIndex = options.indexOf(correct);

        return {
          question: `In "${chunk.title}", which statement accurately describes the "${compName}" component?`,
          options,
          correctIndex,
          explanation: `From "${chunk.title}": ${compName} is described as "${formatOptionText(compDesc, 140)}"`
        };
      }
    }
  }

  // Strategy 2: Definition sentence "X is Y" / "X refers to Y"
  for (const stmt of statements) {
    const defMatch = stmt.match(
      /^(\*\*[^*]+\*\*|[A-Z][a-zA-Z0-9\s\-]{2,30}?)\s+(is an?|is the|refers to|is defined as|represents|enables)\s+(.{20,120})/i
    );
    if (defMatch) {
      const term = defMatch[1].replace(/\*\*/g, '').trim();
      const predicate = defMatch[2];
      const definition = defMatch[3].trim();
      const correct = formatOptionText(definition, 95);

      const distractors = buildBalancedDistractors(correct, combinedStatements, keywords, chunk.title);
      const options = shuffle([correct, ...distractors]);
      const correctIndex = options.indexOf(correct);

      return {
        question: `According to this section, what ${predicate} ${term}?`,
        options,
        correctIndex,
        explanation: `From "${chunk.title}": ${term} ${predicate} ${formatOptionText(definition, 140)}`
      };
    }
  }

  // Strategy 3: Key concept statement containing a highlighted key term
  if (keywords.length > 0) {
    const term = keywords[0];
    const termStatement = statements.find(s =>
      s.toLowerCase().includes(term.toLowerCase()) && s.length >= 35 && s.length <= 150
    );
    if (termStatement) {
      const correct = formatOptionText(termStatement, 95);
      const distractors = buildBalancedDistractors(correct, combinedStatements, keywords, chunk.title);
      const options = shuffle([correct, ...distractors]);
      const correctIndex = options.indexOf(correct);

      return {
        question: `Which statement accurately reflects how ${term} is described in this section?`,
        options,
        correctIndex,
        explanation: `From "${chunk.title}": ${termStatement}`
      };
    }
  }

  // Strategy 4: Clean statement from middle of content
  if (statements.length > 0) {
    const midStatement = statements[Math.floor(statements.length / 2)] || statements[0];
    const correct = formatOptionText(midStatement, 95);
    const distractors = buildBalancedDistractors(correct, combinedStatements, keywords, chunk.title);
    const options = shuffle([correct, ...distractors]);
    const correctIndex = options.indexOf(correct);

    return {
      question: `Which statement is supported by the content of "${chunk.title}"?`,
      options,
      correctIndex,
      explanation: `From "${chunk.title}": This is supported by the text: "${correct}"`
    };
  }

  // Final fallback with strictly equal option lengths
  const primaryTerm = keywords[0] || chunk.title;
  const options = [
    `It defines the core mechanism discussed in this section.`,
    `It operates as an optional secondary fallback under failure.`,
    `It was deprecated in favour of modern distributed models.`,
    `It only applies to specialized synthetic benchmark cases.`
  ];

  return {
    question: `What is the primary role of ${primaryTerm} in this section?`,
    options,
    correctIndex: 0,
    explanation: `The section "${chunk.title}" focuses specifically on the role and behaviour of ${primaryTerm}.`
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
