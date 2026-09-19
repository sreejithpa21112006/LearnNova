# LearnNova

An adaptive reading companion and flashcard studio for active recall
learning.

LearnNova monitors how you read, detects when you skim or go idle,
automatically generates spaced-repetition flashcard decks from your
study material, and schedules future review sessions using the SuperMemo
SM-2 algorithm.

------------------------------------------------------------------------

## Table of Contents

1.  [Problem](#problem)
2.  [Users](#users)
3.  [Solution Overview](#solution-overview)
4.  [Architecture](#architecture)
5.  [Feature Breakdown](#feature-breakdown)
6.  [Project Structure](#project-structure)
7.  [Services Reference](#services-reference)
8.  [Data Flow](#data-flow)
9.  [Tech Stack](#tech-stack)
10. [Getting Started](#getting-started)
11. [Environment Variables](#environment-variables)
12. [Screenshots](#screenshots)
13. [Limitations](#limitations)
14. [Roadmap](#roadmap)
15. [AI-Use Declaration](#ai-use-declaration)
16. [Anki Export Format](#anki-export-format)

------------------------------------------------------------------------

## Problem

Passive reading can make it difficult to retain what was studied.
LearnNova is designed to turn a normal reading session into an
active-recall workflow.

The application monitors reading behaviour, detects patterns such as
skimming and inactivity, provides contextual nudges and comprehension
checkpoints, and converts study material into flashcards for spaced
repetition.

------------------------------------------------------------------------

## Users

LearnNova is designed for people who study from digital documents and
want to turn their reading into an active-recall study workflow.

Typical use cases include:

-   Students reading study material or notes.
-   Learners who want automatic flashcards from their documents.
-   Users who want comprehension checks while reading.
-   Users who want scheduled flashcard review using SM-2.
-   Users who want to export generated cards to Anki.

------------------------------------------------------------------------

## Solution Overview

LearnNova is a single-page React and Vite application that runs entirely
in the browser.

The main workflow is:

**Upload/Paste Study Material → Read with Engagement Tracking → Answer
Checkpoints → Generate Flashcards → Review/Edit Deck → Study with SM-2 →
Export to Anki**

No account, backend, database, or authentication is required.
Application state is stored locally in the browser using `localStorage`.

------------------------------------------------------------------------

## Architecture

The application is divided into four logical layers:

1.  **UI Layer** --- React components for reading, checkpoints, deck
    editing, studying, and settings.
2.  **Orchestration Layer** --- `App.jsx`, which owns global state and
    connects the major features.
3.  **Services Layer** --- JavaScript services for chunking, engagement
    tracking, card generation, SM-2 scheduling, storage, and PDF
    extraction.
4.  **Persistence Layer** --- Browser `localStorage`.

``` text
+-------------------------------------------------------------+
|                     Browser (Client-Only)                   |
|                                                             |
|  +----------------------+   +-----------------------------+ |
|  | UI Layer             |   | Persistence Layer           | |
|  |                      |   |                             | |
|  | Navbar               |   | localStorage                | |
|  | ReadingView          |   | - learnnova_decks           | |
|  | AvatarCompanion      |   | - learnnova_settings       | |
|  | CheckpointModal      |   | - learnnova_active_session | |
|  | DeckReviewModal      |   |                             | |
|  | StudyMode            |   +-----------------------------+ |
|  | DeckListView         |                  |                |
|  | UploadModal          |                  |                |
|  | SettingsModal        |                  |                |
|  +----------+-----------+                  |                |
|             |                              |                |
|             v                              v                |
|  +-----------------------------------------------+          |
|  |              App.jsx (Orchestrator)            |          |
|  |                                               |          |
|  | - Owns global state                           |          |
|  | - Routes between views                        |          |
|  | - Connects EngagementTracker                  |          |
|  | - Passes callbacks to components              |          |
|  +-----+----------+----------+----------+---------+          |
|        |          |          |          |                    |
|        v          v          v          v                    |
|   Chunking   Engagement   Card       SM-2                    |
|   Service    Tracker      Generator  Service                 |
|                                                             |
|                         PDF Service                         |
|                         pdf.js                              |
+-------------------------------------------------------------+
```

### View Routing

`App.jsx` maintains an `activeTab` value that controls the top-level
view.

  Tab        View              Purpose
  ---------- ----------------- -------------------------------------------
  `read`     ReadingView       Document reading with engagement tracking
  `studio`   DeckReviewModal   Card curation and editing
  `study`    StudyMode         SM-2 spaced-repetition study
  `decks`    DeckListView      Saved deck management and Anki export

------------------------------------------------------------------------

## Feature Breakdown

### 1. Document Ingestion

Documents can be loaded in two ways:

-   **PDF Upload** --- PDF text is extracted client-side using
    `pdfjs-dist`.
-   **Paste Text** --- Raw text or Markdown can be pasted directly.

A likely scanned PDF is flagged when extracted text is very short
relative to the page count.

### 2. Document Chunking

`chunkingService.js`:

-   Splits content using Markdown headings.
-   Falls back to paragraph clusters for documents with few headings.
-   Merges very small sections.
-   Splits very large sections into smaller parts.
-   Calculates expected reading time and minimum dwell time.

### 3. Real-Time Engagement Tracking

`EngagementTracker` monitors:

-   Scroll position and velocity.
-   Mouse, keyboard, and touch activity.
-   Page visibility.
-   Chunk boundary transitions.

It detects states such as:

-   `normal`
-   `skimming`
-   `idle`
-   `away`

When appropriate, the application displays a contextual nudge.

### 4. Comprehension Checkpoints

After sufficient reading progress, LearnNova can open a multiple-choice
checkpoint for the current section.

Questions are sourced from:

1.  Pre-authored questions.
2.  Dynamically generated questions based on chunk key terms.

Checkpoint results can later become flashcards.

### 5. Card Generation

The card generator uses client-side NLP heuristics.

It can create:

-   `checkpoint-qa`
-   `definition`
-   `tradeoff`
-   `cloze`
-   `summary`

Generated cards are deduplicated before being added to the deck.

### 6. Card Studio

Before saving a deck, users can:

-   Change card density.
-   Edit questions and answers.
-   Delete cards.
-   Add cards manually.
-   Regenerate the deck.
-   Save the deck.
-   Export the deck for Anki.

### 7. Spaced Repetition Study Mode

Study Mode presents cards one at a time.

Users rate their recall using five grades:

  Button       Grade Meaning
  ---------- ------- --------------------------
  Blackout         1 Complete failure
  Hard             2 Recalled with difficulty
  Okay             3 Recalled with effort
  Good             4 Recalled correctly
  Easy             5 Effortless recall

The SM-2 service updates repetition, interval, ease factor, and next
review date.

### 8. Flashcard Answer Evaluation

Students can type their own answers into a small text box for generated questions. The AI provides an expected answer, compares it with the student's response, and provides a rating or feedback.

### 9. Lecture Lab

Students can paste a YouTube lecture link. Lecture Lab processes the lecture and generates a summary and questions for revision and active recall.

### 10. Deck Management

Users can:

-   View saved decks.
-   See deck statistics.
-   Open decks for editing.
-   Study due cards.
-   Delete decks.
-   Export decks to Anki TSV format.

------------------------------------------------------------------------

## Project Structure

``` text
LearnNova/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── App.css
    ├── components/
    │   ├── Navbar.jsx
    │   ├── ReadingView.jsx
    │   ├── AvatarCompanion.jsx
    │   ├── CheckpointModal.jsx
    │   ├── DeckReviewModal.jsx
    │   ├── StudyMode.jsx
    │   ├── DeckListView.jsx
    │   ├── UploadModal.jsx
    │   └── SettingsModal.jsx
    ├── services/
    │   ├── chunkingService.js
    │   ├── engagementTracker.js
    │   ├── cardGeneratorService.js
    │   ├── sm2Service.js
    │   ├── storageService.js
    │   └── pdfService.js
    └── data/
        └── sampleDocuments.js
```

------------------------------------------------------------------------

## Services Reference

### `chunkingService.js`

``` text
chunkDocument(rawText: string, readingWpm?: number): Chunk[]
```

Splits raw text into reading chunks and calculates dwell targets.

### `engagementTracker.js`

``` text
new EngagementTracker(options)
.start(scrollContainer)
.stop()
.updateChunks(chunks)
.setSensitivity(level)
.setAvatarEnabled(bool)
.markCheckpointAnswered(chunkIndex)
.recordNudgeDismissed()
.recordNudgeEngaged()
```

Tracks browser activity and determines engagement states.

### `cardGeneratorService.js`

``` text
generateDeckFromDocument({
  title,
  chunks,
  checkpointResults,
  density,
  geminiApiKey
}): Promise<Deck>
```

Generates and deduplicates typed flashcards.

### `sm2Service.js`

``` text
calculateSM2(card, grade: 0-5): UpdatedCard
isCardDue(card): boolean
getDeckStats(cards): { total, due, learning, mastered, retentionRate }
exportToAnkiTsv(deck): string
downloadFile(content, filename, contentType?): void
```

Handles SM-2 scheduling, deck statistics, and Anki export.

### `storageService.js`

``` text
getSettings(): Settings
saveSettings(settings): void
getSavedDecks(): Deck[]
saveDeck(deck): Deck[]
deleteDeck(deckId): Deck[]
updateCardReview(deckId, updatedCard): Deck | null
```

Handles browser-local persistence.

### `pdfService.js`

Wraps `pdfjs-dist` and extracts text from uploaded PDF files.

------------------------------------------------------------------------

## Data Flow

``` text
User uploads PDF or pastes text
            |
            v
pdfService extracts text
            |
            v
App.jsx stores current document
            |
            v
chunkingService creates chunks
            |
            v
ReadingView displays chunks
            |
            v
EngagementTracker monitors reading
       |                    |
       v                    v
     Nudges            Checkpoints
                            |
                            v
                  checkpointResults[]
                            |
                            v
                  User clicks Generate Deck
                            |
                            v
             cardGeneratorService
                            |
                            v
                   Generated Deck
                            |
                            v
                    Card Studio
                            |
                            v
                     Save Deck
                            |
                            v
                      Study Mode
                            |
                            v
                    SM-2 scheduling
                            |
                            v
                    localStorage
```

------------------------------------------------------------------------

## Tech Stack

  Technology            Purpose
  --------------------- -------------------------------------------
  React 19              UI component model and state management
  Vite 8                Development server and production bundler
  pdfjs-dist 6          Client-side PDF text extraction
  lucide-react 1.47     Icons
  canvas-confetti 1.9   Deck completion animation
  oxlint 1.81           JavaScript linting
  Vanilla CSS           Application styling
  localStorage          Client-side persistence

No CSS framework, server, database, or authentication is used.

------------------------------------------------------------------------

## Getting Started

### Prerequisites

-   Node.js 18 or later.

### Installation

``` bash
git clone https://github.com/sreejithpa21112006/LearnNova.git
cd LearnNova
npm install
```

### Run the development server

``` bash
npm run dev
```

The application will be available at:

``` text
http://localhost:5173
```

### Build for production

``` bash
npm run build
```

The production output is placed in `dist/`.

### Preview the production build

``` bash
npm run preview
```

------------------------------------------------------------------------

## Environment Variables

LearnNova is fully functional without an API key.

The Gemini API key field in Settings is optional and is currently
reserved for a planned generative card synthesis upgrade.

When no key is provided, the built-in NLP heuristic engine is used.

No `.env` file is required to run the project.

------------------------------------------------------------------------

## Screenshots

Add screenshots of the working application here before the final
submission.

Recommended screenshots:

1.  **Reading View** --- document reading and engagement tracking.
2.  **Engagement Nudge** --- example of a contextual nudge.
3.  **Comprehension Checkpoint** --- multiple-choice checkpoint.
4.  **Card Studio** --- generated cards and editing controls.
5.  **Study Mode** --- flashcard review and SM-2 grading.
6.  **Deck Management** --- saved decks and statistics.

> Replace the placeholders below with actual GitHub image links.

``` text
![Reading View](SCREENSHOT_URL)
![Card Studio](SCREENSHOT_URL)
![Study Mode](SCREENSHOT_URL)
```

------------------------------------------------------------------------

## Limitations

The following limitations are supported by the current implementation:

-   LearnNova is client-only and stores state in browser `localStorage`.
-   There is no account system, backend, database, or authentication.
-   PDF extraction depends on the text available inside the uploaded
    PDF. Scanned/image-heavy PDFs may be flagged as likely scanned.
-   Card generation currently uses client-side NLP heuristics rather
    than requiring a generative API.
-   The Gemini API key is optional and reserved for a planned
    card-synthesis upgrade.
-   Engagement detection is based on browser events such as scrolling,
    activity, visibility, and chunk boundaries.
-   The current README does not establish production hosting or
    multi-device synchronization.

------------------------------------------------------------------------

## Roadmap

Planned improvements indicated by the current project design include:

-   Generative card synthesis using the optional Gemini integration.
-   Further development of the card-generation pipeline.
-   Continued refinement of engagement nudges and study workflows.
-   Additional polish and validation for the complete learning workflow.

------------------------------------------------------------------------

## AI-Use Declaration

AI tools were used during development where applicable for assistance
with:

-   Brainstorming and development guidance.
-   Code-related assistance.
-   Documentation and README preparation.

The final implementation should be reviewed and personally verified by
the project team before submission.

> Update this section with the exact AI tools used by your team and what
> each tool was used for. Do not claim use of a tool that your team did
> not actually use.

------------------------------------------------------------------------

## Anki Export Format

The Anki export produces a plain-text file with tab-separated columns:

``` text
#separator:tab
#html:true
#tags column:3
<Front>    <Back>    <tag1> <tag2>
```

### Import into Anki

1.  Open Anki and go to **File → Import**.
2.  Select the exported `.txt` file.
3.  Set the field separator to **Tab** if it is not detected
    automatically.
4.  Map Field 1 to Front, Field 2 to Back, and Field 3 to Tags.
5.  Click **Import**.

Cloze cards use Anki-compatible `{{c1::word}}` syntax in the Front
field.

------------------------------------------------------------------------
