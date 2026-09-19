import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import StudyFetchNavRail from './components/Layout/StudyFetchNavRail';
import StudyFetchTopBar from './components/Layout/StudyFetchTopBar';
import StudyFetchTutorSidebar from './components/Layout/StudyFetchTutorSidebar';
import StudyPlanView from './components/StudyPlan/StudyPlanView';
import LectureLabView from './components/LectureLab/LectureLabView';
import ReadingView from './components/ReadingView';
import DeckReviewModal from './components/DeckReviewModal';
import StudyMode from './components/StudyMode';
import DeckListView from './components/DeckListView';
import PracticeExamModal from './components/LectureLab/PracticeExamModal';
import StudyHistoryView from './components/History/StudyHistoryView';
import CheckpointModal from './components/CheckpointModal';
import UploadModal from './components/UploadModal';
import SettingsModal from './components/SettingsModal';
import FloatingXPNotification from './components/FloatingXPNotification';
import MascotCompanion from './components/Mascot/MascotCompanion';

import { SAMPLE_DOCUMENTS } from './data/sampleDocuments';
import { chunkDocument } from './services/chunkingService';
import { EngagementTracker } from './services/engagementTracker';
import { awardXp } from './services/gamificationService';
import { generateDeckFromDocument } from './services/cardGeneratorService';
import { 
  getSettings, 
  saveSettings, 
  getSavedDecks, 
  saveDeck, 
  deleteDeck, 
  updateCardReview,
  saveStudyActivity
} from './services/storageService';
import { isCardDue } from './services/sm2Service';
import { generateSmartCheckpoint, shuffleQuizQuestion } from './services/tutorService';

export default function App() {
  // Navigation & Preferences State
  const [activeTab, setActiveTab] = useState('plan'); // 'plan' | 'lecture' | 'read' | 'studio' | 'study' | 'quiz' | 'decks'
  const [theme] = useState('burgundy-ivory');
  const [settings, setSettings] = useState(getSettings());
  const [isTutorOpen, setIsTutorOpen] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(settings.isMascotVoiceEnabled || false);

  // Document & Reading State (Default to rich sample study set)
  const [currentDoc, setCurrentDoc] = useState(SAMPLE_DOCUMENTS[0]);
  const [chunks, setChunks] = useState([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [chunkStatus, setChunkStatus] = useState({});
  const [dwellTimes, setDwellTimes] = useState({});
  const [telemetry, setTelemetry] = useState({ scrollVelocity: 0, idleSeconds: 0, dwellTimes: {} });

  // Real-Time Attention & Checkpoint State
  const [engagementState, setEngagementState] = useState('normal');
  const [activeNudge, setActiveNudge] = useState(null);
  const [activeCheckpointData, setActiveCheckpointData] = useState(null);
  const [checkpointsAnswered, setCheckpointsAnswered] = useState(new Set());
  const [checkpointResults, setCheckpointResults] = useState([]);

  // Decks & Flashcard State
  const [decks, setDecks] = useState([]);
  const [activeDeck, setActiveDeck] = useState(null);
  const [cardDensity, setCardDensity] = useState(settings.cardDensity || 'medium');

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPracticeQuizOpen, setIsPracticeQuizOpen] = useState(false);

  // Tracker Ref
  const trackerRef = useRef(null);

  // Sync theme to DOM & localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('learnnova_theme', theme);
    } catch (e) {}
  }, [theme]);

  // Load Decks
  useEffect(() => {
    const loadedDecks = getSavedDecks();
    setDecks(loadedDecks);
    if (loadedDecks.length > 0 && !activeDeck) {
      setActiveDeck(loadedDecks[0]);
    }
  }, []);

  // Chunk document when currentDoc changes or readingWpm changes
  useEffect(() => {
    if (currentDoc && currentDoc.content) {
      const generatedChunks = chunkDocument(currentDoc.content, settings.readingWpm || 200);
      setChunks(generatedChunks);
      setActiveChunkIndex(0);
      setDwellTimes({});
      setChunkStatus({ 0: 'reading' });
      setCheckpointsAnswered(new Set());
      setCheckpointResults([]);
      setActiveNudge(null);
      setActiveCheckpointData(null);
    }
  }, [currentDoc, settings.readingWpm]);

  // Checkpoint Generator Handler
  const getCheckpointForChunk = useCallback((chunkIdx) => {
    const chunk = chunks[chunkIdx];
    if (!chunk) return null;

    if (currentDoc?.preloadedCheckpoints) {
      const found = currentDoc.preloadedCheckpoints.find(cp => cp.chunkIndex === chunkIdx);
      if (found) {
        return shuffleQuizQuestion({
          ...found,
          chunkIndex: chunkIdx,
          chunkTitle: chunk.title
        });
      }
    }

    const generated = generateSmartCheckpoint(chunk, chunks);
    return shuffleQuizQuestion({
      chunkIndex: chunkIdx,
      chunkTitle: chunk.title,
      ...generated
    });
  }, [chunks, currentDoc]);

  // Generate or gather a comprehensive practice exam tailored to the active study material
  const currentPracticeQuiz = useMemo(() => {
    // 1. If current document has preloaded checkpoints, use them as rich verified questions
    if (currentDoc?.preloadedCheckpoints && currentDoc.preloadedCheckpoints.length > 0) {
      return currentDoc.preloadedCheckpoints.map((cp, idx) => shuffleQuizQuestion({
        ...cp,
        id: `doc-cp-${idx}`,
        chunkIndex: cp.chunkIndex,
        chunkTitle: chunks[cp.chunkIndex]?.title || currentDoc.title
      }));
    }

    // 2. If chunks exist, generate smart checkpoint questions for the chunks
    if (chunks.length > 0) {
      const generated = chunks.slice(0, 5).map((chunk, idx) => {
        const smart = generateSmartCheckpoint(chunk, chunks);
        return {
          id: `chunk-q-${idx}`,
          chunkIndex: idx,
          chunkTitle: chunk.title,
          ...smart
        };
      });
      return generated.map(shuffleQuizQuestion);
    }

    // 3. High-yield foundational practice questions with varied options
    return [
      {
        id: 'exam-q1',
        question: "Why is inductive bias strictly necessary in supervised machine learning models?",
        options: [
          "It accelerates GPU matrix calculations and optimizes tensor cores",
          "It eliminates the need for cross-validation on holdout data",
          "Without inductive bias, infinitely many hypotheses fit any finite training set equally well",
          "It forces loss functions to be strictly convex and differentiable"
        ],
        correctIndex: 2,
        explanation: "Inductive bias provides the prior assumptions necessary to pick a single hypothesis among infinitely many consistent curves."
      },
      {
        id: 'exam-q2',
        question: "How does the modern FSRS algorithm model human memory retrievability R(t)?",
        options: [
          "Via a power decay function governed by elapsed time and memory stability S",
          "Through a fixed 2.5 multiplier like classic Leitner boxes",
          "By deleting cards after 30 days without active review",
          "Using pseudo-random permutation intervals"
        ],
        correctIndex: 0,
        explanation: "FSRS models retrievability R(t) as a power decay governed by item stability S and elapsed days t."
      },
      {
        id: 'exam-q3',
        question: "In Raft consensus, how is the Election Restriction enforced to prevent data loss?",
        options: [
          "Leaders must be co-located in the primary availability zone",
          "Followers deny votes unless the candidate's log is at least as up-to-date as their own",
          "A central ZooKeeper node dictates which candidate can transition to leader",
          "Nodes with lower MAC addresses always yield to higher MAC addresses"
        ],
        correctIndex: 1,
        explanation: "Followers compare logs during RequestVote and reject any candidate that lacks committed entries."
      }
    ].map(shuffleQuizQuestion);
  }, [currentDoc?.id, chunks]);

  // Trigger manual checkpoint
  const handleTriggerManualCheckpoint = useCallback((chunkIdx) => {
    const cp = getCheckpointForChunk(chunkIdx);
    if (cp) {
      setActiveCheckpointData(cp);
      setActiveNudge(null);
    }
  }, [getCheckpointForChunk]);

  // Initialize and bind EngagementTracker for Reading mode
  useEffect(() => {
    if (activeTab !== 'read') {
      if (trackerRef.current) trackerRef.current.stop();
      return;
    }

    const tracker = new EngagementTracker({
      chunks,
      sensitivity: settings.sensitivity,
      readingWpm: settings.readingWpm,
      isAvatarEnabled: true,
      onStateChange: (state) => setEngagementState(state),
      onNudge: (nudge) => setActiveNudge(nudge),
      onCheckpoint: (chunkIdx) => {
        if (!checkpointsAnswered.has(chunkIdx)) {
          const cp = getCheckpointForChunk(chunkIdx);
          if (cp) setActiveCheckpointData(cp);
        }
      },
      onTelemetryUpdate: (data) => {
        setTelemetry(data);
        if (data.dwellTimes) setDwellTimes(data.dwellTimes);
      }
    });

    trackerRef.current = tracker;
    tracker.start();

    return () => tracker.stop();
  }, [chunks, activeTab, settings.sensitivity, settings.readingWpm, checkpointsAnswered, getCheckpointForChunk]);

  // Handle Checkpoint Completion
  const handleCheckpointComplete = useCallback((isCorrect, chunkIndex, chosenAnswer, explanation) => {
    setCheckpointsAnswered(prev => new Set([...prev, chunkIndex]));

    setCheckpointResults(prev => [
      ...prev,
      {
        chunkIndex,
        chunkId: chunks[chunkIndex]?.id,
        chunkTitle: chunks[chunkIndex]?.title,
        question: activeCheckpointData?.question,
        options: activeCheckpointData?.options,
        correctIndex: activeCheckpointData?.correctIndex,
        isCorrect,
        chosenAnswer,
        explanation
      }
    ]);

    setChunkStatus(prev => ({
      ...prev,
      [chunkIndex]: isCorrect ? 'verified' : 'reviewed'
    }));

    // Auto-log section checkpoint to user's study history
    saveStudyActivity({
      type: 'reading',
      title: `Section ${chunkIndex + 1}: ${chunks[chunkIndex]?.title || 'Section Review'}`,
      subtitle: isCorrect ? 'Section Checkpoint Mastered' : 'Section Checkpoint Reviewed',
      chunkIndex,
      checkpointQuestion: activeCheckpointData?.question,
      selectedOption: chosenAnswer,
      correctOption: activeCheckpointData?.options?.[activeCheckpointData?.correctIndex],
      isCorrect,
      explanation,
      dwellSeconds: dwellTimes[chunkIndex] || 60,
      wpm: settings.readingWpm || 200,
      xpEarned: isCorrect ? 20 : 5
    });

    setActiveCheckpointData(null);
  }, [chunks, activeCheckpointData, dwellTimes, settings.readingWpm]);

  // Generate Deck from Document
  const handleGenerateDeck = useCallback(async (density = 'medium') => {
    if (!chunks || chunks.length === 0) return;

    const newDeck = await generateDeckFromDocument({
      title: currentDoc?.title || "Generated Flashcard Deck",
      chunks,
      checkpointResults,
      density,
      geminiApiKey: settings.geminiApiKey,
      algorithm: settings.algorithm || 'fsrs'
    });

    const updated = saveDeck(newDeck);
    setDecks(updated);
    setActiveDeck(newDeck);
    awardXp('section_read', 25, '+25 XP Study Deck Generated!');
  }, [chunks, currentDoc, checkpointResults, settings.geminiApiKey, settings.algorithm]);

  // Update card review in active deck
  const handleUpdateCardReview = useCallback((deckId, updatedCard) => {
    const updated = updateCardReview(deckId, updatedCard);
    if (updated) {
      setActiveDeck(updated);
      setDecks(getSavedDecks());
    }
  }, []);

  // Save curated deck from Card Studio
  const handleSaveDeck = useCallback((updatedDeck) => {
    const updated = saveDeck(updatedDeck);
    setDecks(updated);
    setActiveDeck(updatedDeck);
  }, []);

  // Delete deck
  const handleDeleteDeck = useCallback((deckId) => {
    const remaining = deleteDeck(deckId);
    setDecks(remaining);
    if (activeDeck?.id === deckId) {
      setActiveDeck(remaining[0] || null);
    }
  }, [activeDeck]);

  return (
    <div className="studyfetch-shell">
      {/* 1. Left Vertical Icon Navigation Rail */}
      <StudyFetchNavRail 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        mascotSkin={settings.mascotSkin || 'sparky-pup'}
      />

      {/* 2. Main Center & Top Layout */}
      <div className="studyfetch-main-layout">
        {/* Top Breadcrumbs & Utility Bar */}
        <StudyFetchTopBar 
          studySetName={currentDoc?.title || "My First Study Set"}
          activeTab={activeTab}
          isTutorOpen={isTutorOpen}
          onToggleTutor={() => setIsTutorOpen(!isTutorOpen)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Central Scrollable Study Canvas */}
        <main className="studyfetch-content-canvas">
          {/* TAB 1: Study Plan (Directly matching screenshot) */}
          {activeTab === 'plan' && (
            <StudyPlanView 
              currentDoc={currentDoc}
              chunks={chunks}
              onStartReadingTopic={(topicIdx) => {
                setActiveChunkIndex(topicIdx || 0);
                setActiveTab('read');
              }}
              onStartDiagnosticQuiz={(topicIdx) => {
                handleTriggerManualCheckpoint(topicIdx || 0);
              }}
              onStartFlashcards={() => {
                setActiveTab('studio');
              }}
              onStartLectureLab={() => {
                setActiveTab('lecture');
              }}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {/* TAB 2: Ryne Lecture Lab */}
          {activeTab === 'lecture' && (
            <LectureLabView 
              onOpenInReadingView={() => setActiveTab('read')}
              onSaveGeneratedDeck={(deck) => {
                const updated = saveDeck(deck);
                setDecks(updated);
                setActiveDeck(deck);
              }}
              onSwitchToStudio={(deck) => {
                setActiveDeck(deck);
                setActiveTab('studio');
              }}
            />
          )}

          {/* TAB 3: Reading & Attention Nudge Mode */}
          {activeTab === 'read' && (
            <ReadingView 
              documentData={currentDoc}
              chunks={chunks}
              activeChunkIndex={activeChunkIndex}
              chunkStatus={chunkStatus}
              dwellTimes={dwellTimes}
              onSelectChunk={(idx) => setActiveChunkIndex(idx)}
              onGenerateDeck={() => handleGenerateDeck(cardDensity)}
              onTriggerCheckpointManual={handleTriggerManualCheckpoint}
              checkpointsAnswered={checkpointsAnswered}
              getCheckpointForChunk={getCheckpointForChunk}
              onCompleteCheckpoint={handleCheckpointComplete}
            />
          )}

          {/* TAB 4: Card Studio */}
          {activeTab === 'studio' && (
            <DeckReviewModal 
              deck={activeDeck}
              density={cardDensity}
              onChangeDensity={setCardDensity}
              onRegenerateDeck={(dens) => handleGenerateDeck(dens)}
              onSaveDeck={handleSaveDeck}
              onClose={() => setActiveTab('plan')}
              geminiApiKey={settings.geminiApiKey}
            />
          )}

          {/* TAB 5: Study Mode (FSRS & SM-2) */}
          {activeTab === 'study' && (
            <StudyMode 
              deck={activeDeck}
              onUpdateCard={handleUpdateCardReview}
              onFinishSession={() => setActiveTab('decks')}
              onBackToDecks={() => setActiveTab('decks')}
              algorithm={settings.algorithm || 'fsrs'}
              geminiApiKey={settings.geminiApiKey}
              isMascotVoiceEnabled={settings.isMascotVoiceEnabled}
            />
          )}

          {/* TAB 6: QuizFetch Practice Exam */}
          {activeTab === 'quiz' && (
            <div style={{ maxWidth: '680px', margin: '32px auto' }}>
              <PracticeExamModal 
                quiz={currentPracticeQuiz}
                title={`${currentDoc?.title || 'Comprehensive'} Practice Exam`}
                onClose={() => setActiveTab('plan')}
              />
            </div>
          )}

          {/* TAB 7: Study History & Traceback */}
          {activeTab === 'history' && (
            <StudyHistoryView 
              onJumpToDeck={(deckId) => {
                const targetDeck = decks.find(d => d.id === deckId) || activeDeck || decks[0];
                if (targetDeck) {
                  setActiveDeck(targetDeck);
                  setActiveTab('study');
                }
              }}
              onJumpToReadingSection={(chunkIdx) => {
                setActiveChunkIndex(chunkIdx);
                setActiveTab('read');
              }}
              onJumpToQuiz={() => setActiveTab('quiz')}
              onJumpToStudio={(deckId) => {
                const targetDeck = decks.find(d => d.id === deckId) || activeDeck || decks[0];
                if (targetDeck) {
                  setActiveDeck(targetDeck);
                  setActiveTab('studio');
                }
              }}
            />
          )}

          {/* TAB 8: My Decks & Anki Export */}
          {activeTab === 'decks' && (
            <DeckListView 
              decks={decks}
              onSelectDeckToStudy={(deck) => {
                setActiveDeck(deck);
                setActiveTab('study');
              }}
              onOpenCardStudio={(deck) => {
                setActiveDeck(deck);
                setActiveTab('studio');
              }}
              onDeleteDeck={handleDeleteDeck}
              onSwitchToReading={() => setActiveTab('read')}
            />
          )}
        </main>
      </div>

      {/* 3. Right AI Tutor Sidebar ("Sparky / Nova" with voice call) */}
      <StudyFetchTutorSidebar 
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
        currentDoc={currentDoc}
        chunks={chunks}
        activeChunkIndex={activeChunkIndex}
        geminiApiKey={settings.geminiApiKey}
        mascotSkin={settings.mascotSkin || 'sparky-pup'}
        voiceEnabled={isVoiceEnabled}
        onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
        onTriggerGenerateFlashcards={() => handleGenerateDeck('medium')}
        onTriggerStudyPlan={() => setActiveTab('plan')}
      />

      {/* 4. Floating Mascot Companion (when sidebar is closed) */}
      {!isTutorOpen && (
        <MascotCompanion 
          engagementState={engagementState}
          activeNudge={activeNudge}
          onDismissNudge={() => setActiveNudge(null)}
          onTriggerCheckpoint={() => handleTriggerManualCheckpoint(activeChunkIndex)}
          onOpenChat={() => setIsTutorOpen(true)}
          skin={settings.mascotSkin || 'sparky-pup'}
          voiceEnabled={isVoiceEnabled}
          onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
        />
      )}

      {/* 5. Checkpoint Modal */}
      {activeCheckpointData && (
        <CheckpointModal 
          checkpointData={activeCheckpointData}
          onComplete={handleCheckpointComplete}
          onClose={() => setActiveCheckpointData(null)}
        />
      )}

      {/* 6. Document Ingestion Modal */}
      {isUploadOpen && (
        <UploadModal 
          onSelectDocument={(doc) => {
            setCurrentDoc(doc);
            setActiveTab('plan');
            setIsUploadOpen(false);
          }}
          onClose={() => setIsUploadOpen(false)}
        />
      )}

      {/* 7. Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal 
          settings={settings}
          onSaveSettings={(newSettings) => {
            setSettings(newSettings);
            saveSettings(newSettings);
            setIsVoiceEnabled(newSettings.isMascotVoiceEnabled || false);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* 8. Gamification Floating XP Pill */}
      <FloatingXPNotification />
    </div>
  );
}
