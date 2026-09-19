# LearnNova

An adaptive study companion — intelligent document reading, AI-powered flashcards, spaced repetition, and a Nova Copilot tutor, all in one Burgundy & Ivory interface.

------------------------------------------------------------------------

## Table of Contents

1.  [Overview](#overview)
2.  [Screenshots](#screenshots)
3.  [Features](#features)
4.  [Architecture](#architecture)
5.  [Project Structure](#project-structure)
6.  [Services Reference](#services-reference)
7.  [Tech Stack](#tech-stack)
8.  [Getting Started](#getting-started)
9.  [Environment Variables](#environment-variables)
10. [Deployment](#deployment)
11. [Limitations](#limitations)
12. [Roadmap](#roadmap)
13. [AI-Use Declaration](#ai-use-declaration)
14. [Anki Export Format](#anki-export-format)

------------------------------------------------------------------------

## Overview

LearnNova turns passive reading into an active-recall workflow.

Upload a PDF or paste any text, and LearnNova monitors your engagement,
fires comprehension checkpoints, generates spaced-repetition flashcard
decks, and provides a real-time AI copilot — all client-side, with no
account or backend required.

**Core workflow:**

```text
Upload / Paste Material
        ↓
Adaptive Reading + Engagement Tracking
        ↓
Comprehension Checkpoints + AI Copilot
        ↓
Generate Flashcard Deck (AI or heuristic)
        ↓
Card Studio — Edit, Curate, Export
        ↓
Study Mode — FSRS / SM-2 Spaced Repetition
        ↓
Study History + Practice Quizzes
```

------------------------------------------------------------------------

## Screenshots

### Home & Study Plan
![Home Dashboard](https://raw.githubusercontent.com/sreejithpa21112006/LearnNova/main/public/screenshots/home_dashboard.png)

### Adaptive Reading View
![Reading View](https://raw.githubusercontent.com/sreejithpa21112006/LearnNova/main/public/screenshots/reading_view.png)

### Card Studio
![Card Studio](https://raw.githubusercontent.com/sreejithpa21112006/LearnNova/main/public/screenshots/card_studio.png)

### Study Mode (FSRS Spaced Repetition)
![Study Mode](https://raw.githubusercontent.com/sreejithpa21112006/LearnNova/main/public/screenshots/study_mode.png)

### Practice Quiz (Bloom's Diagnostic)
![Practice Quiz](https://raw.githubusercontent.com/sreejithpa21112006/LearnNova/main/public/screenshots/practice_quiz.png)

### Study History & Traceback
![Study History](https://raw.githubusercontent.com/sreejithpa21112006/LearnNova/main/public/screenshots/study_history.png)

### My Decks
![My Decks](https://raw.githubusercontent.com/sreejithpa21112006/LearnNova/main/public/screenshots/my_decks.png)

------------------------------------------------------------------------

## Features

### 1. Document Ingestion

- **PDF Upload** — client-side text extraction via `pdfjs-dist`.
- **Paste Text / Markdown** — paste any raw study content directly.
- Automatically detects and flags likely scanned / image-heavy PDFs.

### 2. Adaptive Reading + Engagement Tracking

`EngagementTracker` monitors scroll velocity, mouse/keyboard/touch
activity, page visibility, and chunk boundaries to detect:

- `normal` — healthy reading pace.
- `skimming` — scrolling too fast.
- `idle` — no activity detected.
- `away` — page hidden or out of focus.

Contextual nudges appear when engagement drops. Reading chunks are
individually timed and marked as read, reviewed, or verified.

### 3. Comprehension Checkpoints

After sufficient dwell time on a section, a multiple-choice checkpoint
appears. Questions come from:

1. Pre-authored questions bundled with sample documents.
2. AI-generated questions (when a Gemini API key is provided).
3. Smart heuristic questions built from key terms in the chunk.

Correct answers award XP and are logged to Study History.

### 4. Nova Copilot (AI Tutor Sidebar)

A collapsible right-hand panel powered by the Gemini API:

- **Prompt chips** — "Challenge me on this section", "Explain simply
  (ELI5)", "Quick flashcard drill", "Key takeaways & summary",
  "Generate full flashcard deck".
- **Characters** — switch between Friendly Copilot, Socratic Tutor,
  Professor, and ELI5 Explainer personalities.
- **Plugins** — Guided mode steps the copilot through your material
  topic by topic.
- **Voice** — optional text-to-speech for all copilot responses.
- **Live Call** — press Call to have the copilot speak answers and
  challenges aloud in real time.

### 5. Flashcard Generation

Cards are generated from your document using either:

- **Gemini AI** (when an API key is stored in Settings) — rich,
  semantically varied cards.
- **NLP heuristics** — client-side fallback, no API required.

Card types: `checkpoint-qa`, `definition`, `tradeoff`, `cloze`,
`summary`. Generated cards are deduplicated before saving.

### 6. Card Studio

Before saving, curate the generated deck:

- Adjust card density (low / medium / high).
- Edit question and answer text inline.
- Delete or add cards manually.
- Regenerate the full deck.
- Export for Anki.

### 7. Flashcard Typing Evaluation

In Study Mode, students can **type their own answer** instead of
selecting a grade. The Gemini AI compares the typed response to the
expected answer and returns a closeness rating with feedback.

### 8. Study Mode — FSRS & SM-2

Presents cards one at a time. Users self-grade on a five-point scale:

| Button   | Grade | Meaning               |
|----------|-------|-----------------------|
| Blackout | 1     | Complete failure      |
| Hard     | 2     | Recalled with difficulty |
| Okay     | 3     | Recalled with effort  |
| Good     | 4     | Recalled correctly    |
| Easy     | 5     | Effortless recall     |

Supports both **FSRS** (Free Spaced Repetition Scheduler) and classic
**SM-2**. The algorithm updates repetition count, interval, ease
factor, and next review date automatically.

### 9. Practice Quiz

Bloom's Taxonomy diagnostic quiz pulled from the current document's
preloaded checkpoints or auto-generated questions. Shows per-question
rationale and logs results to Study History.

### 10. Study History & Traceback

Every study session is logged:

- Flashcard reviews with AI Match percentage and algorithm used.
- Copilot challenge outcomes.
- Quiz scores and per-question breakdowns.
- Reading section checkpoints.

Jump directly from any history entry back to the relevant deck, section,
or quiz.

### 11. Deck Management

- View all saved decks with mastery statistics.
- Open any deck for editing in Card Studio.
- Study due cards immediately.
- Delete decks.
- Export decks to Anki TSV format.

### 12. Gamification

A floating XP pill awards points for study actions:

- Section read → +15 XP
- Checkpoint correct → +20 XP
- Flashcard recalled → +10 XP
- Exam completed → +35 XP

------------------------------------------------------------------------

## Architecture

```text
+---------------------------------------------------------------------+
|                       Browser (Client-Only)                         |
|                                                                     |
|  +-----------------------------+  +------------------------------+  |
|  | UI Layer                    |  | Persistence Layer            |  |
|  |                             |  |                              |  |
|  | StudyFetchNavRail           |  | localStorage                 |  |
|  | StudyFetchTopBar            |  | - learnnova_decks            |  |
|  | StudyFetchTutorSidebar      |  | - learnnova_settings         |  |
|  | StudyPlanView               |  | - learnnova_study_history    |  |
|  | ReadingView                 |  | - learnnova_active_session   |  |
|  | DeckReviewModal             |  |                              |  |
|  | StudyMode                   |  +------------------------------+  |
|  | StudyHistoryView            |                                    |
|  | PracticeExamModal           |                                    |
|  | DeckListView                |                                    |
|  | MascotCompanion             |                                    |
|  | FloatingXPNotification      |                                    |
|  +-------------+--------------+                                    |
|                |                                                    |
|                v                                                    |
|  +-------------------------------+                                  |
|  |   App.jsx (Orchestrator)      |                                  |
|  |                               |                                  |
|  | - Owns global state           |                                  |
|  | - Routes between views        |                                  |
|  | - Connects EngagementTracker  |                                  |
|  | - Passes callbacks to UI      |                                  |
|  +--+--------+--------+---------+                                  |
|     |        |        |        |                                    |
|     v        v        v        v                                    |
| Chunking Engagement  Card    SM-2 / FSRS                           |
| Service  Tracker   Generator  Service                              |
|                                                                     |
| PDF Service · Tutor Service · Gamification · Storage · OCR Vision  |
+---------------------------------------------------------------------+
```

### View Routing

`App.jsx` routes via an `activeTab` string:

| Tab       | Component           | Purpose                              |
|-----------|---------------------|--------------------------------------|
| `plan`    | StudyPlanView       | Dashboard greeting, quick actions, topic timeline |
| `read`    | ReadingView         | Adaptive reading + engagement tracking |
| `studio`  | DeckReviewModal     | Card curation and editing            |
| `study`   | StudyMode           | FSRS / SM-2 spaced-repetition review |
| `quiz`    | PracticeExamModal   | Bloom's diagnostic practice quiz     |
| `history` | StudyHistoryView    | Study session logs and traceback     |
| `decks`   | DeckListView        | Saved deck management and Anki export |

------------------------------------------------------------------------

## Project Structure

```text
LearnNova/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json                   ← Vercel SPA routing
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   ├── _redirects                ← Netlify SPA routing
│   └── screenshots/              ← README screenshots
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── components/
    │   ├── Layout/
    │   │   ├── StudyFetchNavRail.jsx
    │   │   ├── StudyFetchTopBar.jsx
    │   │   └── StudyFetchTutorSidebar.jsx
    │   ├── StudyPlan/
    │   │   └── StudyPlanView.jsx
    │   ├── History/
    │   │   └── StudyHistoryView.jsx
    │   ├── Mascot/
    │   │   ├── MascotSvg.jsx
    │   │   └── MascotCompanion.jsx
    │   ├── ReadingView.jsx
    │   ├── DeckReviewModal.jsx
    │   ├── StudyMode.jsx
    │   ├── DeckListView.jsx
    │   ├── PracticeExamModal.jsx
    │   ├── CheckpointModal.jsx
    │   ├── UploadModal.jsx
    │   ├── SettingsModal.jsx
    │   └── FloatingXPNotification.jsx
    ├── services/
    │   ├── chunkingService.js
    │   ├── engagementTracker.js
    │   ├── cardGeneratorService.js
    │   ├── tutorService.js
    │   ├── gamificationService.js
    │   ├── fsrsService.js
    │   ├── sm2Service.js
    │   ├── storageService.js
    │   ├── pdfService.js
    │   └── ocrVisionService.js
    └── data/
        └── sampleDocuments.js
```

------------------------------------------------------------------------

## Services Reference

### `chunkingService.js`

```text
chunkDocument(rawText: string, readingWpm?: number): Chunk[]
```

Splits raw text into reading chunks with heading-based structure,
paragraph fallback, and estimated dwell time per chunk.

### `engagementTracker.js`

```text
new EngagementTracker(options)
  .start(scrollContainer)
  .stop()
  .updateChunks(chunks)
  .setSensitivity(level)
  .markCheckpointAnswered(chunkIndex)
```

Tracks browser activity (scroll, mouse, keyboard, touch, visibility)
and emits engagement state changes, nudges, and checkpoint triggers.

### `cardGeneratorService.js`

```text
generateDeckFromDocument({
  title, chunks, checkpointResults, density, geminiApiKey, algorithm
}): Promise<Deck>
```

Generates typed, deduplicated flashcards from document chunks.
Uses Gemini AI when an API key is provided; falls back to NLP
heuristics otherwise.

### `tutorService.js`

```text
generateSmartCheckpoint(chunk, allChunks): CheckpointQuestion
shuffleQuizQuestion(question): ShuffledQuestion
buildTutorPrompt(doc, chunk, message, character): string
evaluateTypedAnswer(question, expected, typed, apiKey): Promise<Evaluation>
```

Generates checkpoint questions, shuffles quiz options, and handles
all Gemini prompt construction and typed-answer evaluation.

### `fsrsService.js` / `sm2Service.js`

```text
// FSRS
calculateFSRS(card, grade): UpdatedCard
getFSRSDeckStats(cards): Stats

// SM-2
calculateSM2(card, grade): UpdatedCard
isCardDue(card): boolean
getDeckStats(cards): { total, due, learning, mastered, retentionRate }
exportToAnkiTsv(deck): string
downloadFile(content, filename, contentType?): void
```

Dual scheduling support: FSRS models memory retrievability as a power
decay; SM-2 uses the classic ease-factor algorithm.

### `gamificationService.js`

```text
awardXp(action: string, amount: number, message?: string): void
```

Dispatches XP events to the `FloatingXPNotification` component.

### `storageService.js`

```text
getSettings(): Settings
saveSettings(settings): void
getSavedDecks(): Deck[]
saveDeck(deck): Deck[]
deleteDeck(deckId): Deck[]
updateCardReview(deckId, updatedCard): Deck | null
saveStudyActivity(activity): void
getStudyHistory(): Activity[]
clearStudyHistory(): void
```

All persistence is browser `localStorage` with zero server dependency.

### `ocrVisionService.js`

Wraps Gemini Vision API to transcribe handwritten or scanned lecture
note images into structured Markdown.

### `pdfService.js`

Wraps `pdfjs-dist` to extract text from uploaded PDF files client-side.

------------------------------------------------------------------------

## Tech Stack

| Technology           | Purpose                                      |
|----------------------|----------------------------------------------|
| React 19             | UI component model and state management      |
| Vite 8               | Development server and production bundler    |
| pdfjs-dist 6         | Client-side PDF text extraction              |
| lucide-react 1.47    | SVG vector icons (Burgundy themed)           |
| canvas-confetti 1.9  | Deck completion and exam celebration effect  |
| Gemini API           | AI card generation, copilot, answer eval     |
| oxlint 1.81          | JavaScript linting                           |
| Vanilla CSS          | Application styling (Burgundy + Ivory theme) |
| localStorage         | Client-side persistence                      |

No CSS framework, server, database, or authentication is used.

------------------------------------------------------------------------

## Getting Started

### Prerequisites

- Node.js 18 or later.

### Installation

```bash
git clone https://github.com/sreejithpa21112006/LearnNova.git
cd LearnNova
npm install
```

### Run the development server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for production

```bash
npm run build
```

Output is placed in `dist/`.

### Preview the production build

```bash
npm run preview
```

------------------------------------------------------------------------

## Environment Variables

LearnNova works fully offline without an API key — the built-in NLP
heuristic engine handles card generation and checkpoint questions.

The Gemini API key unlocks:

- Rich AI-generated flashcards from any document.
- The Nova Copilot sidebar (interactive tutor, challenges, ELI5, etc.).
- Typed-answer evaluation with semantic closeness scoring.
- OCR transcription of handwritten notes.

### Setup

Copy the example file and add your key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

Get a free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

Alternatively, paste your key directly in the **Settings** modal inside
the app — it is saved to `localStorage` and never sent anywhere except
Gemini's own API endpoint.

------------------------------------------------------------------------

## Deployment

The repository includes routing configuration for both platforms.

### Vercel (recommended)

1. Import `sreejithpa21112006/LearnNova` at [vercel.com](https://vercel.com).
2. Framework preset: **Vite** (auto-detected).
3. Build command: `npm run build` · Output directory: `dist`.
4. Add `VITE_GEMINI_API_KEY` under Environment Variables (optional).
5. Deploy.

### Netlify

1. Connect the repository at [netlify.com](https://netlify.com).
2. Build command: `npm run build` · Publish directory: `dist`.
3. Add `VITE_GEMINI_API_KEY` under Site Configuration → Environment
   Variables (optional).
4. Deploy.

------------------------------------------------------------------------

## Limitations

- LearnNova is client-only; state lives in browser `localStorage`.
- There is no account system, backend, database, or authentication.
- PDF extraction relies on embedded text. Scanned / image-only PDFs
  will be flagged and may yield little or no text without OCR.
- AI features require a Gemini API key; the heuristic fallback produces
  functional but simpler flashcards.
- Engagement detection is based on browser events (scroll, mouse,
  keyboard, page visibility); it cannot monitor physical eye movement.
- No multi-device sync.

------------------------------------------------------------------------

## Roadmap

- Collaborative decks and shared study sets.
- Calendar integration for scheduled review sessions.
- Extended OCR pipeline for diagram and equation extraction.
- Analytics dashboard with long-term retention curves.
- Progressive Web App (PWA) offline support.

------------------------------------------------------------------------

## AI-Use Declaration

AI tools were used during development for:

- Feature design and implementation guidance.
- Code generation and refactoring assistance.
- Documentation and README preparation.

The Gemini API is used at runtime for:

- Flashcard generation from uploaded documents.
- Nova Copilot tutor responses and challenges.
- Typed-answer semantic evaluation.
- OCR transcription of handwritten notes.

------------------------------------------------------------------------

## Anki Export Format

The export produces a plain-text file with tab-separated columns:

```text
#separator:tab
#html:true
#tags column:3
<Front>    <Back>    <tag1> <tag2>
```

### Import into Anki

1. Open Anki and go to **File → Import**.
2. Select the exported `.txt` file.
3. Set the field separator to **Tab** if not auto-detected.
4. Map Field 1 → Front, Field 2 → Back, Field 3 → Tags.
5. Click **Import**.

Cloze cards use Anki-compatible `{{c1::word}}` syntax in the Front
field.

------------------------------------------------------------------------
