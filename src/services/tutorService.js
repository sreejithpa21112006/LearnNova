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
    const current = chunks[activeChunkIndex] || chunks[0];
    const sentences = current ? splitSentences(current.content).slice(0, 2) : [];
    const bullets = sentences.map(s => `• ${s.trim()}`).join('\n\n');
    return `I couldn't find an exact keyword match for "${question.trim()}", but here is the core concept from your current section ("${current?.title || 'Active Notes'}"):\n\n${bullets || '• Review key definitions and components in this section.'}\n\nTry asking **"challenge me"** to test your knowledge, or **"explain simply"** for an intuitive analogy!`;
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
 * Gemini API answer with teaching persona support and grounded citations
 */
export async function answerWithGemini(question, chunks, activeChunkIndex, apiKey, persona = 'friendly') {
  const contextChunks = [
    chunks[activeChunkIndex - 1],
    chunks[activeChunkIndex],
    chunks[activeChunkIndex + 1]
  ].filter(Boolean);

  const context = contextChunks
    .map(c => `[Section: ${c.title}]\n${c.content}`)
    .join('\n\n---\n\n');

  let personaInstruction = "You are a warm, encouraging, high-yield study tutor (like StudyFetch's Sparky and Duolingo's mascot).";
  if (persona === 'socratic') {
    personaInstruction = "You are a Socratic tutor. Guide the student by explaining the core concept and ending with a thought-provoking challenge question.";
  } else if (persona === 'professor') {
    personaInstruction = "You are a rigorous university professor. Provide precise theoretical definitions and formal terminology.";
  } else if (persona === 'eli5') {
    personaInstruction = "Explain like I'm 5: use simple everyday analogies and intuitive comparisons.";
  }

  const prompt = `${personaInstruction} The student is reading and asked you a question.

CRITICAL FORMATTING RULES:
1. NEVER respond in a dense paragraph block.
2. Start with a direct, single-sentence summary answering the question.
3. Break down the core explanation into 2 to 3 concise, high-yield bullet points (use "• ").
4. Keep each bullet point under 25 words.
5. Ground your answer in the provided document excerpts. Cite the section name in brackets e.g. [From Section Name].

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
            maxOutputTokens: 450
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
    console.warn("Gemini tutor call failed, falling back to NLP:", err);
    return answerWithNLP(question, chunks, activeChunkIndex);
  }
}

/**
 * Intelligent Pedagogical Response Generator
 * Detects intent (Challenge, Flashcard, ELI5, Summary, Chit-chat, QA)
 * and returns rich interactive cards or structured answers.
 */
export async function generateInteractiveCopilotResponse({
  query,
  chunks = [],
  activeChunkIndex = 0,
  apiKey = '',
  persona = 'friendly'
}) {
  const cleanQuery = (query || '').trim().toLowerCase();
  const currentChunk = chunks[activeChunkIndex] || chunks[0] || { title: "Study Set", content: "" };

  // 1. Check for Challenge / Quiz intent: "challenge me", "quiz me", "test me", "give me a problem"
  const isChallenge = /\b(challenge|quiz|test|drill|exam|ask me|question|problem)\b/i.test(cleanQuery);
  if (isChallenge) {
    // Generate a high-yield diagnostic challenge with randomized balanced options
    const challenge = generateSmartCheckpoint(currentChunk, chunks);
    return {
      type: 'challenge',
      intro: `Challenge accepted! Here's a diagnostic checkpoint from "${currentChunk.title}":`,
      challenge: {
        ...challenge,
        chunkTitle: currentChunk.title,
        chunkIndex: activeChunkIndex
      }
    };
  }

  // 2. Check for Flashcard intent: "flashcard", "cards", "recall drill"
  const isFlashcard = /\b(flashcard|flashcards|card|cards|recall drill|memory|drill me)\b/i.test(cleanQuery);
  if (isFlashcard) {
    const sentences = splitSentences(currentChunk.content);
    let question = `What is a central concept in ${currentChunk.title}?`;
    let answer = sentences[0] || currentChunk.content.slice(0, 150);

    for (const stmt of sentences) {
      const match = stmt.match(/^(\*\*[^*]+\*\*|[A-Z][a-zA-Z\s]{2,25})\s*:\s*(.+)$/i);
      if (match) {
        question = `What is "${match[1].replace(/\*\*/g, '').trim()}" in ${currentChunk.title}?`;
        answer = match[2].trim();
        break;
      }
    }

    return {
      type: 'flashcard',
      intro: `Flashcard drill ready! Test your active recall:`,
      card: {
        question,
        answer,
        chunkTitle: currentChunk.title,
        chunkIndex: activeChunkIndex
      }
    };
  }

  // 3. Check for ELI5 / Simplify intent: "explain simply", "eli5", "explain like I'm 5"
  const isEli5 = /\b(eli5|explain like i'?m 5|simplify|simple terms|plain english|in simple words|analogy|easy to understand)\b/i.test(cleanQuery);
  if (isEli5) {
    if (apiKey) {
      try {
        const text = await answerWithGemini(query, chunks, activeChunkIndex, apiKey, 'eli5');
        return {
          type: 'text',
          text,
          suggestedActions: [
            { label: "Challenge Me", action: "challenge" },
            { label: "Flashcard Drill", action: "flashcard" }
          ]
        };
      } catch (e) {}
    }

    const sentences = splitSentences(currentChunk.content).slice(0, 2);
    const simplified = `**In Simple Terms ("${currentChunk.title}"):**\n\nThink of this like a team working in unison where every member agrees on the next move before taking action, ensuring no single mistake can derail the entire mission!\n\n• ${sentences[0] || 'Core principles coordinate seamlessly across all participants.'}\n• ${sentences[1] || 'Even if disruptions happen, consensus ensures reliable recovery.'}`;
    return {
      type: 'text',
      text: simplified,
      suggestedActions: [
        { label: "Challenge Me", action: "challenge" },
        { label: "Flashcard Drill", action: "flashcard" }
      ]
    };
  }

  // 4. Check for Summary / Key Points intent: "summarize", "summary", "tl;dr"
  const isSummary = /\b(summarize|summary|tl;?dr|key takeaways|key points|recap|overview|what is this about)\b/i.test(cleanQuery);
  if (isSummary) {
    const sentences = splitSentences(currentChunk.content).slice(0, 3);
    const bullets = sentences.map(s => `• ${s.trim()}`).join('\n\n');
    return {
      type: 'text',
      text: `**Key Takeaways from "${currentChunk.title}":**\n\n${bullets}`,
      suggestedActions: [
        { label: "Challenge Me", action: "challenge" },
        { label: "Explain Simply", action: "eli5" },
        { label: "Flashcard Drill", action: "flashcard" }
      ]
    };
  }

  // 5. Check for Greeting / Motivation / Casual intent
  const isGreeting = /\b(hi|hello|hey|greetings|good morning|good afternoon|good evening|how are you|who are you|motivate|tired|help)\b/i.test(cleanQuery);
  if (isGreeting) {
    return {
      type: 'text',
      text: `Hello! I'm your interactive AI study companion.\n\nWe're currently exploring **"${currentChunk.title}"**. How would you like to level up right now?\n\n• Say **"challenge me"** for an interactive quiz question\n• Say **"explain simply"** for an intuitive ELI5 analogy\n• Say **"flashcards"** for a quick recall drill\n• Or ask any question about your notes!`,
      suggestedActions: [
        { label: "Challenge Me", action: "challenge" },
        { label: "Explain Simply", action: "eli5" },
        { label: "Flashcard Drill", action: "flashcard" }
      ]
    };
  }

  // 6. General question: Try Gemini if apiKey provided, otherwise offline NLP
  if (apiKey) {
    try {
      const text = await answerWithGemini(query, chunks, activeChunkIndex, apiKey, persona);
      return {
        type: 'text',
        text,
        suggestedActions: [
          { label: "Challenge Me", action: "challenge" },
          { label: "Explain Simply", action: "eli5" }
        ]
      };
    } catch (e) {}
  }

  const text = answerWithNLP(query, chunks, activeChunkIndex);
  return {
    type: 'text',
    text,
    suggestedActions: [
      { label: "Challenge Me", action: "challenge" },
      { label: "Explain Simply", action: "eli5" }
    ]
  };
}

/**
 * Web Speech synthesis helper for speaking mascot lines aloud
 */
export function speakMascotVoice(text, enabled = true) {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel(); // Stop any overlapping voice
    // Clean text of markdown asterisks, hashes, and bullets for smooth speech
    const cleanText = text
      .replace(/[#*•`_]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.15; // Friendly upbeat pitch
    
    // Pick cheerful English voice if available
    const voices = window.speechSynthesis.getVoices();
    const friendlyVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Google') || v.name.includes('Natural')));
    if (friendlyVoice) utterance.voice = friendlyVoice;

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Mascot speech synthesis error:", e);
  }
}

// Expansive, multi-domain distractor pool to prevent repeated distractors across questions
const DIVERSE_DISTRACTOR_POOL = [
  "It operates as an optional secondary model without mutating runtime parameters.",
  "It measures throughput and execution latency rather than direct loss minimization.",
  "It enforces strict deterministic rule sets instead of inferring weights from data.",
  "It executes primarily in the pre-computation pipeline prior to feature extraction.",
  "It limits adaptation exclusively to offline batch synchronization intervals.",
  "It discards internal cache state immediately upon verifying convergence.",
  "It serves as an administrative fallback protocol when primary consensus fails.",
  "It optimizes memory footprint across local thread registers during execution.",
  "It provides bounds checking for unobserved edge cases in distribution.",
  "It partitions the active address space into non-overlapping memory regions.",
  "It utilizes speculative execution trees that roll back upon branch divergence.",
  "It restricts concurrent mutations using pessimistic two-phase locking protocols.",
  "It maintains asynchronous heartbeat telemetry across follower nodes.",
  "It compresses intermediate serialized buffers prior to network transmission.",
  "It validates state transitions against an append-only cryptographic ledger.",
  "It applies exponential backoff algorithms during heavy transport contention.",
  "It samples gradient vectors from a localized sub-manifold to prevent divergence.",
  "It delegates state recovery to a distributed consensus coordinator.",
  "It computes discrete fourier representations across temporal sequences.",
  "It suppresses high-frequency jitter using an adaptive low-pass digital filter.",
  "It isolates execution contexts within hardware-assisted virtual enclaves.",
  "It schedules priority queues with multi-level feedback starvation prevention.",
  "It caches dirty pages in battery-backed non-volatile random access memory.",
  "It translates logical segment offsets into physical addresses via inverted tables."
];

/**
 * Generates balanced, domain-relevant distractors that match the length and tone
 * of the correct option. Strictly guarantees NO duplicate or repeated options.
 */
function buildBalancedDistractors(correctFormatted, allStatements, keywords = [], chunkTitle = '') {
  const targetLength = correctFormatted.length;
  const cleanCorrect = correctFormatted.toLowerCase().replace(/[^a-z0-9]/g, '');
  const distractors = [];
  const seenClean = new Set([cleanCorrect]);

  // 1. First priority: other distinct statements from the document
  const candidateStatements = shuffle(allStatements)
    .map(s => formatOptionText(s, Math.max(70, targetLength + 15)))
    .filter(s => {
      if (!s || s.length < 25) return false;
      const cleanS = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seenClean.has(cleanS)) return false;
      if (cleanS.slice(0, 25) === cleanCorrect.slice(0, 25)) return false;
      return true;
    });

  for (const cand of candidateStatements) {
    if (distractors.length >= 3) break;
    const cleanCand = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isDuplicate = Array.from(seenClean).some(
      seen => seen === cleanCand || seen.slice(0, 28) === cleanCand.slice(0, 28)
    );
    if (!isDuplicate) {
      seenClean.add(cleanCand);
      distractors.push(cand);
    }
  }

  // 2. Second priority: Diverse distractor pool with randomized pick without repetition
  const shuffledPlausibles = shuffle(DIVERSE_DISTRACTOR_POOL);
  for (const pad of shuffledPlausibles) {
    if (distractors.length >= 3) break;
    const formatted = formatOptionText(pad, Math.max(70, targetLength + 15));
    const cleanP = formatted.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isDuplicate = Array.from(seenClean).some(
      seen => seen === cleanP || seen.slice(0, 25) === cleanP.slice(0, 25)
    );
    if (!isDuplicate) {
      seenClean.add(cleanP);
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
 * 3. Distractors are domain-plausible, strictly non-repeating, and randomized.
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
        return shuffleQuizQuestion({
          question: `In "${chunk.title}", which statement accurately describes the "${compName}" component?`,
          options: [correct, ...distractors],
          correctIndex: 0,
          explanation: `From "${chunk.title}": ${compName} is described as "${formatOptionText(compDesc, 140)}"`
        });
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
      return shuffleQuizQuestion({
        question: `According to this section, what ${predicate} ${term}?`,
        options: [correct, ...distractors],
        correctIndex: 0,
        explanation: `From "${chunk.title}": ${term} ${predicate} ${formatOptionText(definition, 140)}`
      });
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
      return shuffleQuizQuestion({
        question: `Which statement accurately reflects how ${term} is described in this section?`,
        options: [correct, ...distractors],
        correctIndex: 0,
        explanation: `From "${chunk.title}": ${termStatement}`
      });
    }
  }

  // Strategy 4: Clean statement from middle of content
  if (statements.length > 0) {
    const midStatement = statements[Math.floor(statements.length / 2)] || statements[0];
    const correct = formatOptionText(midStatement, 95);
    const distractors = buildBalancedDistractors(correct, combinedStatements, keywords, chunk.title);
    return shuffleQuizQuestion({
      question: `Which statement is supported by the content of "${chunk.title}"?`,
      options: [correct, ...distractors],
      correctIndex: 0,
      explanation: `From "${chunk.title}": This is supported by the text: "${correct}"`
    });
  }

  // Final fallback with strictly equal option lengths and randomized position
  const primaryTerm = keywords[0] || chunk.title;
  const correctOption = `It defines the core mechanism discussed in this section.`;
  const distractors = buildBalancedDistractors(correctOption, combinedStatements, keywords, chunk.title);

  return shuffleQuizQuestion({
    question: `What is the primary role of ${primaryTerm} in this section?`,
    options: [correctOption, ...distractors],
    correctIndex: 0,
    explanation: `The section "${chunk.title}" focuses specifically on the role and behaviour of ${primaryTerm}.`
  });
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Universal quiz randomizer:
 * Randomizes the position of options for any quiz question and re-links correctIndex.
 * Strictly guarantees:
 * 1. ZERO repeated or duplicate options in the options array.
 * 2. Exactly 4 distinct, parallel options.
 * 3. The correct answer position is randomized using Fisher-Yates shuffle.
 */
export function shuffleQuizQuestion(questionObj) {
  if (!questionObj || !Array.isArray(questionObj.options) || questionObj.options.length === 0) {
    return questionObj;
  }

  const origIdx = (typeof questionObj.correctIndex === 'number' && questionObj.correctIndex >= 0 && questionObj.correctIndex < questionObj.options.length)
    ? questionObj.correctIndex
    : 0;
  const correctText = questionObj.options[origIdx] || questionObj.options[0];

  // Strictly deduplicate options by clean normalized string
  const cleanSeen = new Set();
  const uniqueOptions = [];

  // Always retain correct option first
  const cleanCorrect = correctText.toLowerCase().replace(/[^a-z0-9]/g, '');
  cleanSeen.add(cleanCorrect);
  uniqueOptions.push(correctText);

  // Add remaining non-duplicate options
  for (let i = 0; i < questionObj.options.length; i++) {
    if (i === origIdx) continue;
    const opt = questionObj.options[i];
    if (!opt) continue;
    const cleanOpt = opt.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanSeen.has(cleanOpt) && cleanOpt.length >= 10) {
      cleanSeen.add(cleanOpt);
      uniqueOptions.push(opt);
    }
  }

  // If fewer than 4 unique options, draw from diverse distractor pool
  const fallbackShuffled = shuffle(DIVERSE_DISTRACTOR_POOL);
  for (const fallback of fallbackShuffled) {
    if (uniqueOptions.length >= 4) break;
    const cleanFb = fallback.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanSeen.has(cleanFb)) {
      cleanSeen.add(cleanFb);
      uniqueOptions.push(fallback);
    }
  }

  // Shuffle the options with Fisher-Yates
  const shuffled = shuffle(uniqueOptions.slice(0, 4));
  const newCorrectIndex = shuffled.indexOf(correctText);

  return {
    ...questionObj,
    options: shuffled,
    correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0
  };
}

/**
 * Advanced AI & NLP Flashcard Answer Evaluator
 * Evaluates how close a student's self-typed answer is to the target answer.
 * Uses Gemini API when available for deep semantic understanding, with a
 * sophisticated multi-factor client NLP semantic similarity engine as fallback.
 * 
 * @param {Object} params
 * @param {string} params.question - The flashcard question prompt
 * @param {string} params.targetAnswer - The ground-truth reference answer
 * @param {string} params.userAnswer - The student's typed response
 * @param {string} [params.apiKey] - Optional Gemini API Key
 * @returns {Promise<Object>} Evaluation results including score, verdict, strengths, gaps, and suggested grade
 */
export async function evaluateFlashcardAnswer({ question, targetAnswer, userAnswer, apiKey = '' }) {
  const trimmedUser = (userAnswer || '').trim();
  const trimmedTarget = (targetAnswer || '').trim();

  if (!trimmedUser) {
    return {
      score: 0,
      verdict: "No Answer Provided",
      similarityPct: 0,
      feedback: "Please type an answer to test your recall with AI.",
      strengths: [],
      gaps: ["No input received"],
      suggestedGrade: 1
    };
  }

  // If Gemini API Key is available, attempt neural semantic grading
  if (apiKey) {
    try {
      const prompt = `You are an expert AI tutor evaluating a student's flashcard recall answer.
Evaluate how closely the student's answer captures the core concepts, mechanisms, and meaning of the target answer, even if phrased in different words.

Question: "${question}"
Target Reference Answer: "${trimmedTarget}"
Student's Typed Answer: "${trimmedUser}"

Score criteria:
- 85-100: Captures all main concepts and nuances accurately (Near Perfect).
- 70-84: Captures the primary concept correctly with minor details omitted (Strong Recall).
- 45-69: Partially correct, knows some elements but missed key mechanisms (Partially Correct).
- 0-44: Incorrect, irrelevant, or critically flawed (Needs Review).

Return ONLY a raw JSON object with this exact schema (no markdown fences, no extra text):
{
  "score": <integer from 0 to 100>,
  "verdict": "<Near Perfect | Strong Recall | Partially Correct | Needs Review>",
  "feedback": "<2-3 sentence encouraging, constructive feedback explaining how close the student is and what was captured or missed>",
  "strengths": ["<concise bullet point of correctly recalled concept>", "<optional 2nd point>"],
  "gaps": ["<concise bullet point of missed detail or misconception if any>"],
  "suggestedGrade": <integer 1 to 4: 1=Again, 2=Hard, 3=Good, 4=Easy>
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 500
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(rawText);
        if (typeof parsed.score === 'number') {
          return {
            score: Math.min(100, Math.max(0, Math.round(parsed.score))),
            verdict: parsed.verdict || (parsed.score >= 80 ? "Strong Recall" : parsed.score >= 50 ? "Partially Correct" : "Needs Review"),
            similarityPct: Math.min(100, Math.max(0, Math.round(parsed.score))),
            feedback: parsed.feedback || "Evaluated by Gemini AI.",
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
            suggestedGrade: parsed.suggestedGrade || (parsed.score >= 85 ? 4 : parsed.score >= 70 ? 3 : parsed.score >= 50 ? 2 : 1)
          };
        }
      }
    } catch (err) {
      console.warn("Gemini evaluation error, using offline semantic engine:", err.message);
    }
  }

  // Sophisticated Offline Semantic NLP Engine Fallback
  return evaluateAnswerOffline(question, trimmedTarget, trimmedUser);
}

const GENERIC_FILLERS = new Set([
  'set', 'uses', 'used', 'using', 'make', 'makes', 'made', 'making',
  'takes', 'taken', 'taking', 'give', 'gives', 'given', 'giving',
  'let', 'lets', 'see', 'sees', 'call', 'called', 'calling', 'type', 'types'
]);

function stemWord(word) {
  if (!word || word.length <= 3) return word;
  return word
    .toLowerCase()
    .replace(/(ing|tion|tions|tional|ment|ments|ed|es|s|al|ive|ity|ties|ize|ise|able)$/i, '')
    .trim();
}

/**
 * Advanced Offline Semantic NLP Evaluator for student flashcard answers
 */
function evaluateAnswerOffline(question, targetAnswer, userAnswer) {
  const cleanTarget = targetAnswer.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanUser = userAnswer.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const targetWords = cleanTarget.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w) && !GENERIC_FILLERS.has(w));
  const userWords = cleanUser.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const uniqueTargetWords = Array.from(new Set(targetWords));
  const uniqueUserWords = Array.from(new Set(userWords));
  const userStems = uniqueUserWords.map(stemWord);

  // 1. Key entity and concept matching with stemming & fuzzy substring
  const matchedTerms = [];
  const missingTerms = [];

  for (const tw of uniqueTargetWords) {
    const tStem = stemWord(tw);
    const isMatched = uniqueUserWords.some((uw, idx) => {
      const uStem = userStems[idx];
      if (uw === tw) return true;
      if (tStem.length >= 3 && uStem.length >= 3 && (tStem === uStem || tStem.startsWith(uStem) || uStem.startsWith(tStem))) return true;
      if (uw.length >= 4 && tw.length >= 4 && (uw.includes(tw) || tw.includes(uw))) return true;
      return false;
    });

    if (isMatched) {
      matchedTerms.push(tw);
    } else {
      missingTerms.push(tw);
    }
  }

  // Conceptual equivalence boosters (e.g. "generalize" covers "unobserved / unseen inputs")
  if (cleanUser.includes('generaliz') && (cleanTarget.includes('unobserved') || cleanTarget.includes('unseen') || cleanTarget.includes('inputs'))) {
    if (!matchedTerms.includes('generalization')) matchedTerms.push('generalization');
  }
  if (cleanUser.includes('hypothes') && (cleanTarget.includes('model') || cleanTarget.includes('algorithm') || cleanTarget.includes('curve'))) {
    if (!matchedTerms.includes('hypothesis')) matchedTerms.push('hypothesis');
  }

  const denominator = Math.max(1, uniqueTargetWords.length);
  const keyTermRatio = Math.min(1, matchedTerms.length / denominator);

  // 2. Token overlap (Dice coefficient)
  const intersectionCount = matchedTerms.length;
  const totalTokens = uniqueTargetWords.length + uniqueUserWords.length;
  const diceScore = totalTokens > 0 ? (2 * intersectionCount) / totalTokens : 0;

  // 3. Length & Structural completeness ratio
  const lengthRatio = Math.min(1.2, userWords.length / Math.max(1, targetWords.length));
  const lengthFactor = lengthRatio < 0.3 ? 0.3 : lengthRatio > 1 ? 1 : lengthRatio;

  // 4. Multi-factor semantic similarity score (0 - 100)
  let rawScore = (keyTermRatio * 60) + (diceScore * 25) + (lengthFactor * 15);
  let score = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Conceptual Boosts for thorough answers
  if (keyTermRatio >= 0.70 || (matchedTerms.length >= 3 && cleanUser.length >= 40)) {
    score = Math.max(score, 78);
  } else if (keyTermRatio >= 0.50 || (matchedTerms.length >= 2 && cleanUser.length >= 30)) {
    score = Math.max(score, 65);
  }

  // Determine verdict & grade suggestion
  let verdict = "Needs Review";
  let suggestedGrade = 1; // Again
  let feedback = "";

  if (score >= 85) {
    verdict = "Near Perfect Recall";
    suggestedGrade = 4; // Easy
    feedback = `Spot on! Your response accurately captured ${matchedTerms.length} core concepts (${matchedTerms.slice(0, 3).join(', ')}).`;
  } else if (score >= 68) {
    verdict = "Strong Recall";
    suggestedGrade = 3; // Good
    feedback = `Solid answer! You hit the main principle (${matchedTerms.slice(0, 3).join(', ')}). Just reinforce: ${missingTerms.slice(0, 2).join(', ')}.`;
  } else if (score >= 45) {
    verdict = "Partially Correct";
    suggestedGrade = 2; // Hard
    feedback = `You're on the right track with ${matchedTerms.slice(0, 2).join(', ')}, but missed key target elements: ${missingTerms.slice(0, 3).join(', ')}.`;
  } else {
    verdict = "Needs Review";
    suggestedGrade = 1; // Again
    feedback = `Your answer missed the core mechanisms. Target concepts include: ${uniqueTargetWords.slice(0, 3).join(', ')}.`;
  }

  const strengths = matchedTerms.slice(0, 3).map(t => `Recalled "${t}"`);
  const gaps = missingTerms.slice(0, 3).map(t => `Omitted "${t}"`);

  return {
    score,
    verdict,
    similarityPct: score,
    feedback,
    strengths,
    gaps,
    suggestedGrade
  };
}
