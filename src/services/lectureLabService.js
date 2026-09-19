/**
 * lectureLabService.js
 * 
 * Comprehensive Ryne Lecture Lab Engine
 * Ingestion: Audio/Video files, Live Microphone Recorder, YouTube URLs, Handwritten Notes
 * Outputs:
 * - Timestamped Synchronized Transcripts
 * - Cornell-Style Structured Notes & Outline
 * - Key Concepts Glossary with Real-World Analogies
 * - Practice Exam Questions (Bloom's Taxonomy)
 * - 2-Speaker AI Podcast Audio Discussion
 */

import { shuffleQuizQuestion } from './tutorService';

/**
 * Extracts YouTube Video ID from standard YouTube URLs
 */
export function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

/**
 * Sample Preset High-Yield Lectures for Instant Exploration
 */
export const PRESET_LECTURES = [
  {
    id: 'cs188-ml-fundamentals',
    title: 'CS188: Machine Learning & Inductive Bias',
    category: 'Computer Science',
    durationSeconds: 180,
    youtubeId: 'q5P1tZ2KxY0',
    audioUrl: null,
    summary: 'A foundational lecture on machine learning problems, inductive bias, hypothesis spaces, and generalization.',
    transcript: [
      { start: 0, end: 18, text: "Welcome back everyone. Today we're diving into the heart of modern artificial intelligence: Machine Learning and Inductive Bias." },
      { start: 19, end: 38, text: "In classic symbolic AI, programmers explicitly hand-crafted all the rules. In machine learning, we invert that paradigm: the computer infers the function directly from input-output examples." },
      { start: 39, end: 60, text: "Formally, a learning problem consists of three primary ingredients: the Task T, the Performance measure P, and the Experience E." },
      { start: 61, end: 84, text: "If we improve at Task T according to measure P with experience E, we have successfully learned. But here is the fundamental dilemma: every dataset is finite, yet the real world is infinite." },
      { start: 85, end: 110, text: "This brings us to Inductive Bias. Without assumptions about which hypotheses are preferred, a learner cannot generalize beyond observed training points at all. No-Free-Lunch theorem guarantees this." },
      { start: 111, end: 140, text: "Occam's Razor is the most prevalent inductive bias: when two hypotheses explain the data equally well, prefer the simpler one, such as smaller trees or lower-degree polynomials." },
      { start: 141, end: 165, text: "Next, we'll examine how loss functions and regularization terms mathematically encode this bias to prevent overfitting." },
      { start: 166, end: 180, text: "To summarize: learning is optimization over a hypothesis space constrained by our chosen inductive bias." }
    ],
    notes: {
      summary: "This lecture covers the foundational definition of machine learning (Tom Mitchell's T, P, E triad), the necessity of inductive bias for generalization, and the mathematical role of Occam's Razor.",
      keyTakeaways: [
        "A formal learning problem requires Task T, Performance Measure P, and Experience E.",
        "Without inductive bias, generalizing from a finite dataset to unobserved inputs is mathematically impossible.",
        "Occam's Razor prefers the simplest consistent hypothesis, mitigating the risk of overfitting."
      ],
      outline: [
        {
          heading: "1. The Inversion of Classical Programming",
          content: "Instead of writing rules by hand, machine learning systems optimize parameters over empirical training data to learn mapping functions $f(x) \\rightarrow y$."
        },
        {
          heading: "2. Mitchell's Triad (T, P, E)",
          content: "A program learns if its performance at task T, measured by metric P, improves with experience E over time."
        },
        {
          heading: "3. The Inductive Bias Imperative",
          content: "The No-Free-Lunch theorem shows that no algorithm outperforms random guessing across all possible problems. Priors and structural constraints are mandatory."
        },
        {
          heading: "4. Regularization and Occam's Razor",
          content: "L1 and L2 penalty terms formalize the preference for simpler parameter spaces, penalizing over-parameterized models."
        }
      ]
    },
    concepts: [
      {
        term: "Inductive Bias",
        definition: "The set of prior assumptions an algorithm uses to predict outputs for unobserved inputs.",
        analogy: "Like a detective assuming human motivations rather than extraterrestrial anomalies when investigating a puzzle.",
        difficulty: "Hard"
      },
      {
        term: "Experience (E)",
        definition: "The empirical dataset or interaction history provided to the learner.",
        analogy: "The historical past exam papers a student solves before taking the actual test.",
        difficulty: "Easy"
      },
      {
        term: "Occam's Razor",
        definition: "The philosophical principle that simpler hypotheses should be favored over needlessly complex ones.",
        analogy: "If you hear hoofbeats behind you, think horses before zebras.",
        difficulty: "Medium"
      }
    ],
    quiz: [
      {
        id: 'q1',
        question: "According to Tom Mitchell's formal framework, what are the three components of a learning problem?",
        options: [
          "Task (T), Performance measure (P), and Experience (E)",
          "Time (T), Processing power (P), and Entropy (E)",
          "Theory (T), Parameters (P), and Evaluation (E)",
          "Target (T), Precision (P), and Error (E)"
        ],
        correctIndex: 0,
        explanation: "Mitchell defines machine learning as: 'A computer program is said to learn from experience E with respect to some class of tasks T and performance measure P...'"
      },
      {
        id: 'q2',
        question: "Why is an inductive bias strictly necessary for machine learning?",
        options: [
          "To speed up GPU matrix multiplication operations",
          "Because finite data alone cannot uniquely determine predictions on unseen points",
          "To eliminate the need for any labeled training datasets",
          "Because loss functions cannot be calculated without gradient descent"
        ],
        correctIndex: 1,
        explanation: "Without prior assumptions (inductive bias), infinitely many hypotheses can fit any finite set of points equally well, making generalization impossible."
      },
      {
        id: 'q3',
        question: "How does Occam's Razor manifest in modern neural network training?",
        options: [
          "Using higher learning rates on smaller batches",
          "Weight decay (L2 regularization) and dropout that penalize complex weights",
          "Increasing the number of layers indefinitely",
          "Randomly shuffling the input labels"
        ],
        correctIndex: 1,
        explanation: "Weight decay and regularization constrain the complexity of the hypothesis space, implementing a mathematical preference for simpler, smoother functions."
      }
    ],
    podcast: [
      { speaker: "Alex", text: "Welcome back to the LearnNova Lecture Pod! Today, Sam and I are breaking down the mystery of Machine Learning and why inductive bias is the secret sauce behind every AI model." },
      { speaker: "Sam", text: "Thanks Alex. You know, most people think AI is just feeding data into a computer and magic happens. But Mitchell's definition actually gives us three concrete pillars: Task, Performance, and Experience." },
      { speaker: "Alex", text: "Exactly. But here is the real kicker from this lecture: without inductive bias, an AI can NEVER generalize. If you don't give it any assumptions, any crazy curve could fit the training points." },
      { speaker: "Sam", text: "Right! That's where Occam's Razor comes in. Favor the simplest explanation that fits the observations. In modern deep learning, we turn that into L1 and L2 regularization to stop overfitting in its tracks." },
      { speaker: "Alex", text: "So whenever you see a model generalize well on unseen test data, remember: it wasn't just the data—it was the inductive bias designed into the architecture." }
    ]
  },
  {
    id: 'bio101-cellular-respiration',
    title: 'BIO101: Cellular Respiration & ATP Synthesis',
    category: 'Biology',
    durationSeconds: 150,
    youtubeId: 'eJ9Zjc-jdys',
    audioUrl: null,
    summary: 'Glycolysis, the Krebs cycle, and oxidative phosphorylation yielding ATP for metabolic work.',
    transcript: [
      { start: 0, end: 20, text: "Good morning. Today we're exploring Cellular Respiration: how cells convert biochemical energy from nutrients into ATP." },
      { start: 21, end: 45, text: "The process occurs in three main stages: Glycolysis in the cytosol, the Citric Acid Cycle in the mitochondrial matrix, and Oxidative Phosphorylation on the inner mitochondrial membrane." },
      { start: 46, end: 80, text: "Glycolysis breaks down one glucose molecule into two pyruvates, yielding a net 2 ATP and 2 NADH without requiring oxygen." },
      { start: 81, end: 115, text: "Next, the Krebs Cycle oxidizes acetyl-CoA, loading electron carriers NADH and FADH2 with high-energy electrons." },
      { start: 116, end: 150, text: "Finally, ATP Synthase uses the proton-motive force across the cristae membrane like a microscopic water wheel to generate ~28 to 32 ATP." }
    ],
    notes: {
      summary: "Overview of the biochemical pathway converting glucose to ATP across three stages: Glycolysis, Krebs Cycle, and Electron Transport Chain.",
      keyTakeaways: [
        "Glycolysis is anaerobic and takes place in the cytosol, producing 2 net ATP.",
        "The Krebs cycle oxidizes carbon compounds to load electron shuttles (NADH and FADH2).",
        "Oxidative phosphorylation generates the vast majority of ATP via the proton electrochemical gradient."
      ],
      outline: [
        { heading: "1. Glycolysis", content: "Breakdown of glucose into pyruvate; net 2 ATP + 2 NADH." },
        { heading: "2. The Krebs Cycle", content: "Occurs in matrix; releases CO2, generates GTP/ATP and electron carriers." },
        { heading: "3. Electron Transport Chain & Chemiosmosis", content: "Proton gradient powers ATP Synthase rotary turbine." }
      ]
    },
    concepts: [
      { term: "ATP Synthase", definition: "A rotary molecular motor that synthesizes ATP from ADP and inorganic phosphate driven by a proton gradient.", analogy: "A hydroelectric turbine powered by water pressure.", difficulty: "Medium" },
      { term: "Proton-Motive Force", definition: "An electrochemical gradient of hydrogen ions across the inner mitochondrial membrane.", analogy: "Water banked up behind a high dam.", difficulty: "Hard" }
    ],
    quiz: [
      {
        id: 'bio-q1',
        question: "Where in the eukaryotic cell does glycolysis take place?",
        options: ["Mitochondrial Matrix", "Cytosol", "Inner Mitochondrial Membrane", "Nucleus"],
        correctIndex: 1,
        explanation: "Glycolysis is an anaerobic pathway occurring exclusively in the cytosol."
      },
      {
        id: 'bio-q2',
        question: "What directly drives the rotary synthesis of ATP in ATP Synthase?",
        options: [
          "Direct hydrolysis of glucose in the mitochondrial outer membrane",
          "Active transport of sodium ions across the cristae",
          "The proton electrochemical gradient (proton-motive force) across the inner membrane",
          "Electromagnetic radiation absorption in the thylakoids"
        ],
        correctIndex: 2,
        explanation: "ATP Synthase functions like a molecular water wheel powered by the flow of protons down their electrochemical gradient."
      },
      {
        id: 'bio-q3',
        question: "What is the net yield of ATP molecules generated per glucose during Glycolysis alone?",
        options: ["2 net ATP", "32 net ATP", "0 ATP", "16 net ATP"],
        correctIndex: 0,
        explanation: "Glycolysis consumes 2 ATP during the investment phase and generates 4 ATP in payoff, giving a net yield of 2 ATP."
      }
    ],
    podcast: [
      { speaker: "Alex", text: "Hey everyone! Today on the Study Pod we're exploring Cellular Respiration, the ultimate energy generator of life." },
      { speaker: "Sam", text: "Think of glucose like crude oil. Cells can't burn it directly—they refine it through glycolysis and the Krebs cycle into ATP, the universal energy currency." }
    ]
  }
];

/**
 * Generates lecture materials from raw text or transcript using client NLP & heuristics
 */
export function generateLectureMaterialsFromText(text, title = "Custom Lecture") {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean);
  
  // 1. Build timestamped segments (~15 words per segment)
  const segments = [];
  let currentTime = 0;
  for (let i = 0; i < words.length; i += 18) {
    const chunkWords = words.slice(i, i + 18).join(' ');
    const duration = Math.max(4, Math.round(chunkWords.length / 15));
    segments.push({
      start: currentTime,
      end: currentTime + duration,
      text: chunkWords
    });
    currentTime += duration;
  }

  // 2. Extract Headings and Key Concepts
  const outline = [];
  const concepts = [];
  const keyTakeaways = [];

  paragraphs.forEach((p, idx) => {
    if (p.startsWith('#') || p.length < 70) {
      const headingText = p.replace(/^#+\s*/, '').trim();
      outline.push({
        heading: `${idx + 1}. ${headingText}`,
        content: paragraphs[idx + 1] || "Core lecture points and principles."
      });
    }

    // Concept detection: look for definitions or bold terms
    const defMatch = p.match(/\*\*([^*]+)\*\*:\s*(.+)/) || p.match(/^([A-Z][a-zA-Z\s]{2,25})\s+is\s+(.+)/);
    if (defMatch && concepts.length < 5) {
      concepts.push({
        term: defMatch[1].trim(),
        definition: defMatch[2].slice(0, 140).trim(),
        analogy: `A practical everyday model to remember ${defMatch[1].trim()}`,
        difficulty: "Medium"
      });
    }

    if (p.length > 50 && keyTakeaways.length < 4) {
      keyTakeaways.push(p.slice(0, 120).trim() + (p.length > 120 ? '...' : ''));
    }
  });

  if (keyTakeaways.length === 0) {
    keyTakeaways.push(
      "Identified core subject principles from the recorded lecture session.",
      "Highlighted essential relationships and problem formulations.",
      "Summarized actionable review topics for spaced repetition."
    );
  }

  if (concepts.length === 0) {
    concepts.push({
      term: title,
      definition: `Foundational mechanisms and operational principles of ${title}.`,
      analogy: "The foundational brick supporting the entire intellectual arch.",
      difficulty: "Medium"
    });
  }

  // 3. Generate Practice Quiz with strictly randomized option positions and unique distractors
  const primaryConcept = concepts[0]?.term || title;
  const secondaryConcept = concepts[1]?.term || "State Machine Invariants";

  const rawQuiz = [
    {
      id: `quiz-1`,
      question: `What is the primary theme and objective discussed in "${title}"?`,
      options: [
        `Standard administrative announcements and syllabus disclaimers`,
        `The core principles, mechanisms, and models outlined in the lecture`,
        `Historical computing architecture obsolete before modern AI`,
        `Purely theoretical proofs with zero empirical application`
      ],
      correctIndex: 1,
      explanation: `The lecture focuses specifically on the core mechanisms and insights of ${title}.`
    },
    {
      id: `quiz-2`,
      question: `Which concept is identified as a primary pillar in this lecture?`,
      options: [
        "Static arbitrary memory fragmentation",
        "Uncalibrated random guess distributions",
        primaryConcept,
        "Deprecated single-instruction architectures"
      ],
      correctIndex: 2,
      explanation: `${primaryConcept} is directly explored as a central topic in the lecture material.`
    },
    {
      id: `quiz-3`,
      question: `In the context of ${title}, which principle is essential for systemic correctness?`,
      options: [
        "Elimination of all runtime validation to minimize latency",
        `Maintaining strict operational invariants across ${secondaryConcept}`,
        "Executing all transactions on a single unverified edge node",
        "Random permutation of stored records every clock cycle"
      ],
      correctIndex: 1,
      explanation: `Maintaining valid system invariants is vital for predictable outcomes in ${title}.`
    }
  ];

  const quiz = rawQuiz.map(shuffleQuizQuestion);

  // 4. Generate 2-speaker podcast dialog
  const podcast = [
    { speaker: "Alex", text: `Welcome to the Study Pod recap of "${title}". Today we're breaking down the key takeaways from this lecture.` },
    { speaker: "Sam", text: `Right Alex! What struck me most was how the concepts were broken down: ${keyTakeaways[0] || 'the core problem framework'}.` },
    { speaker: "Alex", text: `Exactly. If you only remember one thing for your exams, remember: ${concepts[0]?.term || 'the foundational mechanism'} is essential.` },
    { speaker: "Sam", text: `That's a wrap for this quick recap. Check out the flashcards and practice quizzes in your Study Hub to lock this into long-term memory!` }
  ];

  return {
    id: `custom-lecture-${Date.now()}`,
    title,
    category: "Lecture Lab Session",
    durationSeconds: currentTime,
    transcript: segments,
    notes: {
      summary: paragraphs.slice(0, 2).join(' ') || `Comprehensive lecture notes covering ${title}.`,
      keyTakeaways,
      outline: outline.length > 0 ? outline : [
        { heading: "1. Overview & Problem Formulation", content: text.slice(0, 300) }
      ]
    },
    concepts,
    quiz,
    podcast
  };
}

/**
 * Text-to-Speech Web Speech API utility for the AI Podcast player
 */
export class PodcastSpeechEngine {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.isPlaying = false;
    this.currentIndex = 0;
    this.onProgress = null;
    this.onEnd = null;

    if (this.synth) {
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  getVoiceForSpeaker(speaker) {
    if (!this.voices || this.voices.length === 0) return null;
    const englishVoices = this.voices.filter(v => v.lang.startsWith('en'));
    const pool = englishVoices.length > 0 ? englishVoices : this.voices;

    if (speaker === "Alex") {
      // Prefer friendly voice A
      return pool.find(v => v.name.includes('David') || v.name.includes('Natural') || v.name.includes('Guy')) || pool[0];
    } else {
      // Prefer voice B
      return pool.find(v => v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Female')) || pool[1] || pool[0];
    }
  }

  playEpisode(dialogue, onProgress, onEnd) {
    if (!this.synth) return;
    this.stop();
    this.isPlaying = true;
    this.dialogue = dialogue;
    this.currentIndex = 0;
    this.onProgress = onProgress;
    this.onEnd = onEnd;

    this.speakCurrentLine();
  }

  speakCurrentLine() {
    if (!this.isPlaying || this.currentIndex >= this.dialogue.length) {
      this.isPlaying = false;
      this.onEnd?.();
      return;
    }

    const item = this.dialogue[this.currentIndex];
    this.onProgress?.(this.currentIndex, item);

    const utterance = new SpeechSynthesisUtterance(item.text);
    const voice = this.getVoiceForSpeaker(item.speaker);
    if (voice) utterance.voice = voice;

    // Pitch & rate variation between speakers
    if (item.speaker === "Alex") {
      utterance.pitch = 1.0;
      utterance.rate = 1.05;
    } else {
      utterance.pitch = 1.15;
      utterance.rate = 1.0;
    }

    utterance.onend = () => {
      if (this.isPlaying) {
        this.currentIndex++;
        // Small breathing gap
        setTimeout(() => this.speakCurrentLine(), 350);
      }
    };

    utterance.onerror = (e) => {
      console.warn("Speech error:", e);
      if (this.isPlaying) {
        this.currentIndex++;
        this.speakCurrentLine();
      }
    };

    this.synth.speak(utterance);
  }

  pause() {
    if (this.synth) {
      this.synth.pause();
      this.isPlaying = false;
    }
  }

  resume() {
    if (this.synth) {
      this.synth.resume();
      this.isPlaying = true;
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.synth) {
      this.synth.cancel();
    }
  }
}
