# LearnNova

An adaptive reading companion and flashcard studio for active recall learning.
LearnNova monitors how you read, detects when you skim or go idle, automatically generates
spaced-repetition flashcard decks from your study material, and schedules future review
sessions using the SuperMemo SM-2 algorithm.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Feature Breakdown](#feature-breakdown)
4. [Project Structure](#project-structure)
5. [Services Reference](#services-reference)
6. [Data Flow](#data-flow)
7. [Tech Stack](#tech-stack)
8. [Getting Started](#getting-started)
9. [Environment Variables](#environment-variables)
10. [Anki Export Format](#anki-export-format)

---

## Overview

LearnNova is a single-page application built with React and Vite. It is designed around the
idea that passive reading produces poor retention. The application actively monitors reading
behaviour through browser APIs, intervenes with contextual nudges and comprehension checkpoints,
and converts a reading session directly into a curated flashcard deck ready for spaced repetition.

No account, no backend, and no data ever leaves the browser. All state is persisted in
`localStorage` under the `learnnova_` key namespace.

---

## Architecture

The application is divided into four logical layers: the UI layer (React components), the
orchestration layer (App.jsx), the services layer (pure JS modules), and the persistence
layer (localStorage via storageService).

```
+-------------------------------------------------------------+
|                        Browser (Client-Only)                |
|                                                             |
|  +------------------------+  +---------------------------+  |
|  |    UI Layer            |  |   Persistence Layer       |  |
|  |                        |  |                           |  |
|  |  Navbar                |  |  localStorage             |  |
|  |  ReadingView           |  |  - learnnova_decks        |  |
|  |  AvatarCompanion       |  |  - learnnova_settings     |  |
|  |  CheckpointModal       |  |  - learnnova_active_      |  |
|  |  DeckReviewModal       |  |    session                |  |
|  |  StudyMode             |  |                           |  |
|  |  DeckListView          |  +---------------------------+  |
|  |  UploadModal           |             |                   |
|  |  SettingsModal         |             |                   |
|  +----------+-------------+             |                   |
|             |                           |                   |
|             v                           v                   |
|  +---------------------------------------------+           |
|  |              App.jsx  (Orchestrator)         |           |
|  |                                              |           |
|  |  - Owns all global state                     |           |
|  |  - Routes between the four views             |           |
|  |  - Connects EngagementTracker lifecycle      |           |
|  |  - Passes callbacks down to components       |           |
|  +-----+--------+--------+--------+------------+           |
|        |        |        |        |                         |
|        v        v        v        v                         |
|  +----------+ +--------+ +------+ +-----------+            |
|  | chunking | | engage-| | card | |    sm2    |            |
|  | Service  | | ment   | | Gene-| |  Service  |            |
|  |          | | Tracker| | rator| |           |            |
|  | Splits   | |        | | Svc  | | SM-2      |            |
|  | raw text | | Scroll | |      | | scheduling|            |
|  | into     | | Idle   | | NLP  | | isCardDue |            |
|  | chunks   | | Skim   | | heur-| | getDeck   |            |
|  | with     | | Visibi-| | isti-| | Stats     |            |
|  | dwell    | | lity   | | cs + | | exportTo  |            |
|  | targets  | | detect | | Gemi-| | AnkiTsv   |            |
|  +----------+ +--------+ | ni   | +-----------+            |
|                          +------+                           |
|                                                             |
|  +----------------------------------+                       |
|  |          pdfService              |                       |
|  |  pdf.js (pdfjs-dist)             |                       |
|  |  Extracts text from PDF uploads  |                       |
|  +----------------------------------+                       |
+-------------------------------------------------------------+
```

### View Routing

App.jsx maintains an `activeTab` string that controls which top-level view is rendered.
There is no client-side router library; views are conditionally rendered inline.

| Tab value | View rendered       | Purpose                                      |
|-----------|---------------------|----------------------------------------------|
| `read`    | ReadingView         | Document reading with engagement tracking    |
| `studio`  | DeckReviewModal     | Card curation, editing, density control      |
| `study`   | StudyMode           | SM-2 spaced repetition active recall session |
| `decks`   | DeckListView        | Saved deck management and Anki export        |

---

## Feature Breakdown

### 1. Document Ingestion

Documents can be loaded in two ways:

- **PDF Upload** — The PDF is parsed client-side using `pdfjs-dist`. Text is extracted
  page by page and concatenated. If the extracted text is very short relative to the page
  count, the file is flagged as a likely scanned image with a warning to the user.

- **Paste Text** — Raw text or Markdown can be pasted directly into a textarea. The user
  provides an optional title; the content is treated identically to a PDF extract.

Once a document is loaded, App.jsx stores it in `currentDoc` state and the chunking pipeline
runs automatically.

---

### 2. Document Chunking

`chunkingService.js` converts raw text into an array of `chunk` objects. The chunking
strategy works as follows:

1. **Heading-based splitting** — The text is scanned for Markdown headings (`#`, `##`, `###`).
   Each heading starts a new chunk containing all lines until the next heading.

2. **Paragraph cluster fallback** — If fewer than two headings are found and the document
   is longer than 800 characters, the text is split by double newlines and paragraphs are
   grouped into clusters of approximately 250 words each.

3. **Merge tiny sections** — Sections shorter than 35 words are merged into the previous
   chunk to avoid an excessive number of trivially small cards.

4. **Split large sections** — Sections longer than 450 words are recursively split at
   paragraph boundaries targeting 250 words per part. Split sections receive a `(Part N)`
   suffix on their title.

Each chunk object carries:

| Field                  | Type     | Description                                          |
|------------------------|----------|------------------------------------------------------|
| `id`                   | string   | Unique identifier (`chunk-0`, `chunk-1`, ...)        |
| `index`                | number   | Zero-based position in the document                 |
| `title`                | string   | Heading text or auto-generated label                 |
| `content`              | string   | Raw text content of the section                      |
| `wordCount`            | number   | Number of whitespace-delimited words                 |
| `expectedDwellSeconds` | number   | Estimated reading time at the user's configured WPM  |
| `minDwellSeconds`      | number   | 35% of expected dwell; minimum to count as "read"    |
| `keyTerms`             | string[] | Up to 5 extracted terms (bold tokens and acronyms)   |

---

### 3. Real-Time Engagement Tracking

`EngagementTracker` is a class instantiated by App.jsx and attached to the `window` scroll
context while the read tab is active. It runs a 1-second ticker interval and listens to
four browser event sources.

**Event sources monitored:**

| Source                   | API used                             | What it detects          |
|--------------------------|--------------------------------------|--------------------------|
| Scroll position          | `scroll` event on `window`           | Active chunk, velocity   |
| User activity            | `mousemove`, `keydown`, `touchstart` | Idle detection           |
| Tab visibility           | Page Visibility API                  | Away / return detection  |
| Chunk boundary crossing  | `getBoundingClientRect` on DOM nodes | Section transitions      |

**Engagement states:**

| State      | Condition                                             | Action taken           |
|------------|-------------------------------------------------------|------------------------|
| `normal`   | Default; user is actively reading                     | None                   |
| `skimming` | Scroll velocity > 450 px/s and dwell < min threshold  | Nudge dispatched       |
| `idle`     | No activity for 35/50/75 s (high/medium/low)          | Nudge dispatched       |
| `away`     | Tab becomes hidden via Page Visibility API            | Tracking paused        |

**Adaptive back-off** — If the user dismisses nudges without engaging, the cooldown between
nudges doubles at two ignored nudges and triples at four. After three consecutive dismissals
a break suggestion is emitted instead of a content-specific nudge.

**Checkpoint triggers** — When the tracker detects that the user has scrolled past a chunk
boundary with sufficient dwell time, it calls `onCheckpoint(chunkIndex)`. App.jsx receives
this and opens the CheckpointModal for that section if the user has not already answered it.

---

### 4. Comprehension Checkpoints

CheckpointModal displays a four-option multiple-choice question tied to the current section.
Questions are sourced in priority order:

1. Pre-authored questions embedded in the document data object (`preloadedCheckpoints`).
2. A dynamically generated question built from the chunk's key terms if no pre-authored
   question exists.

On completion, the result object is pushed into `checkpointResults` in App.jsx state. These
results are later harvested by the card generator to produce `checkpoint-qa` type cards.

---

### 5. Card Generation

`cardGeneratorService.js` implements a multi-heuristic NLP pipeline that runs entirely
client-side without requiring an API key.

**Pipeline steps:**

**Step 1 — Harvest checkpoints.** Every answered checkpoint question is converted directly
into a `checkpoint-qa` card, preserving the question, correct answer text, and explanation.

**Step 2 — Per-chunk extraction.** For each chunk, up to N cards are extracted where N is
controlled by the density setting (`low` = 1, `medium` = 2, `high` = 3).

The four extraction heuristics applied per chunk, in order of priority:

| Heuristic | Pattern detected                                      | Card type produced |
|-----------|-------------------------------------------------------|--------------------|
| A         | Sentence matching "X is a/the ..." or "X refers to"  | `definition`       |
| B         | Sentence containing "vs", "versus", or "Instead of"  | `tradeoff`         |
| C         | First key term found verbatim in a sentence           | `cloze`            |
| D         | Fallback if A-C yield nothing                         | `summary`          |

**Step 3 — Deduplication.** Cards with identical normalised questions (lowercase, stripped
punctuation) are removed.

**Cloze format** — Cloze cards store the target word in the `answer` field and the
sentence with `[...]` in the `question` field. They also store an Anki-compatible
`{{c1::word}}` substitution in the `text` field for export.

---

### 6. Card Studio (Deck Review)

DeckReviewModal provides an editable view of the generated deck before it is saved.

- **Density switcher** — Changing the density selector triggers a full regeneration call
  against the same chunks and checkpoint results.
- **Edit** — Each card has an inline edit form that allows the question and answer fields
  to be modified.
- **Delete** — Individual cards can be removed from the deck before saving.
- **Add Card** — A blank card can be manually appended to the deck.
- **Regenerate** — Discards the current deck and runs the generation pipeline again.
- **Save Deck** — Persists the deck to `localStorage` and routes the user to Study Mode.
- **Export Anki** — Calls `exportToAnkiTsv` and triggers a browser download of a `.txt`
  file formatted for Anki import.

---

### 7. Spaced Repetition Study Mode

StudyMode presents cards one at a time in a flip-card interface. After revealing the answer,
the user selects a self-assessed recall quality from one of five buttons mapped to SM-2
grades 1 through 5.

The **SuperMemo SM-2 algorithm** updates three scheduling fields on each card:

| Field        | Initial value | Description                                          |
|--------------|---------------|------------------------------------------------------|
| `repetition` | 0             | Number of consecutive successful recalls             |
| `interval`   | 1             | Days until next review (1, 6, then EF-multiplied)    |
| `easeFactor` | 2.5           | Ease multiplier; floored at 1.3; range approx 1.3–3  |

Grade mapping used in the UI:

| Button label | SM-2 grade | Interpretation          |
|--------------|------------|-------------------------|
| Blackout     | 1          | Complete failure        |
| Hard         | 2          | Recalled with difficulty|
| Okay         | 3          | Recalled with effort    |
| Good         | 4          | Recalled correctly      |
| Easy         | 5          | Effortless recall       |

A card with `repetition >= 3` is classified as "mastered" in deck statistics.

---

### 8. Deck Management

DeckListView displays all saved decks with per-deck statistics computed by `getDeckStats`:
total cards, cards due today, cards in learning, mastered cards, and a retention rate
percentage derived from review history.

From this view the user can:
- Open any deck directly in Card Studio for editing.
- Start a study session with the due cards of any deck.
- Delete a deck permanently from localStorage.
- Export any deck to Anki TSV format.

---

## Project Structure

```
LearnNova/
├── index.html                        # Application shell; sets page title and meta tags
├── package.json
├── vite.config.js
│
├── public/
│   ├── favicon.svg
│   └── icons.svg
│
└── src/
    ├── main.jsx                      # React root mount point
    ├── App.jsx                       # Central orchestrator; owns all global state
    ├── index.css                     # Full design system (CSS custom properties, components)
    ├── App.css                       # Application-level layout overrides
    │
    ├── components/
    │   ├── Navbar.jsx                # Top navigation bar; tab switcher and action buttons
    │   ├── ReadingView.jsx           # Document reader pane with chunk cards and progress
    │   ├── AvatarCompanion.jsx       # Floating Copilot avatar; renders nudges and state
    │   ├── CheckpointModal.jsx       # MCQ comprehension modal triggered by tracker or user
    │   ├── DeckReviewModal.jsx       # Card Studio view; edit, delete, add, save deck
    │   ├── StudyMode.jsx             # SM-2 flashcard flip-card study session
    │   ├── DeckListView.jsx          # Saved decks list with stats and actions
    │   ├── UploadModal.jsx           # Document ingestion; PDF upload and paste text
    │   └── SettingsModal.jsx         # User preferences; WPM, sensitivity, API key
    │
    ├── services/
    │   ├── chunkingService.js        # Splits raw text into timed, key-term-tagged chunks
    │   ├── engagementTracker.js      # Browser event monitoring; state machine; nudge engine
    │   ├── cardGeneratorService.js   # NLP heuristic pipeline; produces typed card objects
    │   ├── sm2Service.js             # SM-2 algorithm; deck stats; Anki TSV export
    │   ├── storageService.js         # localStorage CRUD for decks and settings
    │   └── pdfService.js             # pdf.js wrapper; text extraction from PDF files
    │
    └── data/
        └── sampleDocuments.js        # (Legacy) Pre-authored CSE study texts
```

---

## Services Reference

### chunkingService.js

```
chunkDocument(rawText: string, readingWpm?: number): Chunk[]
```

Parses raw text and returns an ordered array of chunk objects with computed dwell targets.

---

### engagementTracker.js

```
new EngagementTracker(options)
  .start(scrollContainer)   -- begins event listeners and 1s ticker
  .stop()                   -- removes all listeners; clears interval
  .updateChunks(chunks)     -- refreshes chunk array after re-chunking
  .setSensitivity(level)    -- 'low' | 'medium' | 'high'
  .setAvatarEnabled(bool)   -- enables or suppresses nudge output
  .markCheckpointAnswered(chunkIndex)
  .recordNudgeDismissed()
  .recordNudgeEngaged()
```

Options accepted: `chunks`, `sensitivity`, `readingWpm`, `isAvatarEnabled`,
`onStateChange(state, meta)`, `onNudge(nudge)`, `onCheckpoint(chunkIndex)`,
`onProgressUpdate(telemetry)`.

---

### cardGeneratorService.js

```
generateDeckFromDocument({ title, chunks, checkpointResults, density, geminiApiKey }): Promise<Deck>
```

Returns a `Deck` object containing an `id`, `title`, `createdAt`, `cardCount`, and a
`cards` array of typed card objects. All cards initialise with SM-2 fields set to their
default values (`repetition: 0`, `interval: 1`, `easeFactor: 2.5`).

---

### sm2Service.js

```
calculateSM2(card, grade: 0-5): UpdatedCard
isCardDue(card): boolean
getDeckStats(cards): { total, due, learning, mastered, retentionRate }
exportToAnkiTsv(deck): string
downloadFile(content, filename, contentType?)
```

---

### storageService.js

```
getSettings(): Settings
saveSettings(settings): void
getSavedDecks(): Deck[]
saveDeck(deck): Deck[]
deleteDeck(deckId): Deck[]
updateCardReview(deckId, updatedCard): Deck | null
```

All deck reads automatically strip the legacy `starter-raft-deck` entry if present from
an older version of the application.

---

### pdfService.js

Wraps `pdfjs-dist`. Accepts a `File` object, renders each page to a text layer, concatenates
results, and returns `{ text, title, pageCount, isScannedLikely }`. A document is flagged as
likely scanned if extracted characters per page fall below 100.

---

## Data Flow

The following describes the full lifecycle of a study session from document load to card review.

```
User uploads PDF or pastes text
          |
          v
    pdfService.extractTextFromPdf()
          |
          v
    App.jsx sets currentDoc state
          |
          v
    chunkingService.chunkDocument()
    --> returns Chunk[]
          |
          v
    ReadingView renders chunk cards
    EngagementTracker.start() attaches to window
          |
    (reading session)
          |
    +--> EngagementTracker.tick() every 1s
    |        accumulates dwellTimes[chunkIndex]
    |        detects idle / skim / away states
    |        emits onNudge() --> AvatarCompanion shows nudge bubble
    |        emits onCheckpoint() --> CheckpointModal opens
    |
    +--> User scrolls, answers checkpoints
             checkpointResults[] accumulates in App.jsx
          |
          v
    User clicks "Generate Deck"
          |
          v
    cardGeneratorService.generateDeckFromDocument()
    --> harvests checkpointResults as checkpoint-qa cards
    --> runs NLP heuristics (definition, tradeoff, cloze, summary)
    --> deduplicates
    --> returns Deck object
          |
          v
    App.jsx sets activeDeck, switches to 'studio' tab
          |
          v
    DeckReviewModal: user edits / deletes / adds cards
          |
          v
    User clicks "Save Deck"
          |
          v
    storageService.saveDeck() --> localStorage
    App.jsx switches to 'study' tab
          |
          v
    StudyMode presents cards one at a time
    User rates recall quality (grade 1-5)
          |
          v
    sm2Service.calculateSM2(card, grade)
    --> updates interval, repetition, easeFactor, nextReviewDate
          |
          v
    storageService.updateCardReview() persists updated card
    DeckListView shows updated due count
```

---

## Tech Stack

| Dependency       | Version  | Purpose                                              |
|------------------|----------|------------------------------------------------------|
| React            | 19       | UI component model and state management              |
| Vite             | 8        | Development server and production bundler            |
| pdfjs-dist       | 6        | Client-side PDF text extraction via Web Workers      |
| lucide-react     | 1.47     | Icon set (all icons are inline SVGs)                 |
| canvas-confetti  | 1.9      | Confetti animation on deck completion                |
| oxlint           | 1.81     | Fast Rust-based JavaScript linter (dev only)         |

No CSS framework is used. All styling is written in Vanilla CSS using custom properties
defined in `src/index.css`. No server, no database, no authentication.

---

## Getting Started

**Prerequisites:** Node.js 18 or later.

```bash
# Clone the repository
git clone https://github.com/sreejithpa21112006/LearnNova.git
cd LearnNova

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:5173`.

To build for production:

```bash
npm run build
# Output is placed in dist/
```

To preview the production build locally:

```bash
npm run preview
```

---

## Environment Variables

LearnNova is fully functional without any API key. The Gemini API key field in Settings
is optional and currently reserved for a planned generative card synthesis upgrade. When
no key is provided, the built-in NLP heuristic engine is used exclusively.

There are no `.env` files required to run this project.

---

## Anki Export Format

The Anki export produces a plain text file (`deck-title.txt`) with the following header
and tab-separated columns:

```
#separator:tab
#html:true
#tags column:3
<Front>    <Back>    <tag1> <tag2>
```

To import into Anki:
1. Open Anki and go to File > Import.
2. Select the exported `.txt` file.
3. Set the field separator to Tab if Anki does not auto-detect it.
4. Map Field 1 to Front, Field 2 to Back, and Field 3 to Tags.
5. Click Import.

Cloze cards export with `{{c1::word}}` syntax in the Front field for compatibility with
Anki's built-in Cloze note type.
