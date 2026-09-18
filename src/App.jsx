import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from './components/Navbar';
import ReadingView from './components/ReadingView';
import AvatarCompanion from './components/AvatarCompanion';
import CheckpointModal from './components/CheckpointModal';
import DeckReviewModal from './components/DeckReviewModal';
import StudyMode from './components/StudyMode';
import DeckListView from './components/DeckListView';
import UploadModal from './components/UploadModal';
import SettingsModal from './components/SettingsModal';


import { chunkDocument } from './services/chunkingService';
import { EngagementTracker } from './services/engagementTracker';
import { generateDeckFromDocument } from './services/cardGeneratorService';
import { 
  getSettings, 
  saveSettings, 
  getSavedDecks, 
  saveDeck, 
  deleteDeck, 
  updateCardReview 
} from './services/storageService';
import { isCardDue } from './services/sm2Service';
import { generateSmartCheckpoint } from './services/tutorService';

export default function App() {
  // Navigation & Preferences State
  const [activeTab, setActiveTab] = useState('read'); // 'read' | 'studio' | 'study' | 'decks'
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('learnnova_theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  });
  const [settings, setSettings] = useState(getSettings());
  const [isAvatarEnabled, setIsAvatarEnabled] = useState(settings.isAvatarEnabled !== false);

  // Document & Reading State
  const [currentDoc, setCurrentDoc] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [chunkStatus, setChunkStatus] = useState({});
  const [dwellTimes, setDwellTimes] = useState({});
  const [telemetry, setTelemetry] = useState({ scrollVelocity: 0, idleSeconds: 0, dwellTimes: {} });

  // Real-Time Attention & Checkpoint State
  const [engagementState, setEngagementState] = useState('normal'); // 'normal' | 'skimming' | 'idle' | 'away'
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

  // Refs
  const trackerRef = useRef(null);

  // Sync theme to DOM & localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('learnnova_theme', theme);
    } catch (e) {}
  }, [theme]);

  // Load Decks and initialize first deck
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
      const generatedChunks = chunkDocument(currentDoc.content, settings.readingWpm);
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

  // Setup Checkpoint Generation Handler
  const getCheckpointForChunk = useCallback((chunkIdx) => {
    const chunk = chunks[chunkIdx];
    if (!chunk) return null;

    // Check if the current document has pre-loaded curated checkpoints for this chunk
    if (currentDoc?.preloadedCheckpoints) {
      const found = currentDoc.preloadedCheckpoints.find(cp => cp.chunkIndex === chunkIdx);
      if (found) {
        return {
          ...found,
          chunkIndex: chunkIdx,
          chunkTitle: chunk.title
        };
      }
    }

    // Generate a smart, length-balanced checkpoint from the actual chunk content
    const generated = generateSmartCheckpoint(chunk, chunks);
    return {
      chunkIndex: chunkIdx,
      chunkTitle: chunk.title,
      ...generated
    };
  }, [chunks, currentDoc]);

  // Trigger manual checkpoint
  const handleTriggerManualCheckpoint = useCallback((chunkIdx) => {
    const cp = getCheckpointForChunk(chunkIdx);
    if (cp) {
      setActiveCheckpointData(cp);
      setActiveNudge(null);
    }
  }, [getCheckpointForChunk]);

  // Initialize and bind EngagementTracker
  useEffect(() => {
    if (activeTab !== 'read') {
      if (trackerRef.current) trackerRef.current.stop();
      return;
    }

    const tracker = new EngagementTracker({
      chunks,
      sensitivity: settings.sensitivity,
      readingWpm: settings.readingWpm,
      isAvatarEnabled,
      onStateChange: (state, meta) => {
        setEngagementState(state);
      },
      onNudge: (nudge) => {
        setActiveNudge(nudge);
      },
      onCheckpoint: (chunkIdx) => {
        // Automatic checkpoint trigger at section boundary
        if (isAvatarEnabled && !checkpointsAnswered.has(chunkIdx)) {
          const cp = getCheckpointForChunk(chunkIdx);
          if (cp) {
            setActiveCheckpointData(cp);
          }
        }
      },
      onProgressUpdate: (telemetryData) => {
        setActiveChunkIndex(telemetryData.activeChunkIndex);
        setDwellTimes(telemetryData.dwellTimes);
        setChunkStatus(telemetryData.chunkStatus);
        setTelemetry(telemetryData);
      }
    });

    tracker.updateChunks(chunks);
    tracker.start(window);
    trackerRef.current = tracker;

    return () => {
      tracker.stop();
    };
  }, [activeTab, chunks, settings.sensitivity, settings.readingWpm, isAvatarEnabled, checkpointsAnswered, getCheckpointForChunk]);

  // Instant Avatar Toggle (FR10: visible, always available, zero confirmation dialog)
  const handleToggleAvatar = () => {
    const nextVal = !isAvatarEnabled;
    setIsAvatarEnabled(nextVal);
    const updated = { ...settings, isAvatarEnabled: nextVal };
    setSettings(updated);
    saveSettings(updated);
    if (trackerRef.current) {
      trackerRef.current.setAvatarEnabled(nextVal);
    }
    if (!nextVal) {
      setActiveNudge(null);
      setEngagementState('away');
    } else {
      setEngagementState('normal');
    }
  };

  // Sensitivity Change Handler
  const handleChangeSensitivity = (newLevel) => {
    const updated = { ...settings, sensitivity: newLevel };
    setSettings(updated);
    saveSettings(updated);
    if (trackerRef.current) {
      trackerRef.current.setSensitivity(newLevel);
    }
  };

  // Checkpoint answered handler
  const handleCheckpointComplete = (result) => {
    setCheckpointsAnswered(prev => new Set([...prev, result.chunkIndex]));
    setCheckpointResults(prev => [...prev, result]);
    setActiveCheckpointData(null);
    if (trackerRef.current) {
      trackerRef.current.markCheckpointAnswered(result.chunkIndex);
    }
    setEngagementState('normal');
  };

  // Generate Deck from Reading Session
  const handleGenerateDeck = async (targetDensity = cardDensity) => {
    const deck = await generateDeckFromDocument({
      title: currentDoc.title,
      chunks,
      checkpointResults,
      density: targetDensity,
      geminiApiKey: settings.geminiApiKey
    });

    setActiveDeck(deck);
    setActiveTab('studio');
  };

  // Save Deck from Studio
  const handleSaveDeck = (deckToSave) => {
    const updatedDecks = saveDeck(deckToSave);
    setDecks(updatedDecks);
    setActiveDeck(deckToSave);
    setActiveTab('study');
  };

  // Update SM-2 Card Review
  const handleUpdateCardReview = (deckId, updatedCard) => {
    const updatedDeck = updateCardReview(deckId, updatedCard);
    if (updatedDeck) {
      const updatedDecks = getSavedDecks();
      setDecks(updatedDecks);
      if (activeDeck?.id === deckId) {
        setActiveDeck(updatedDeck);
      }
    }
  };

  // Delete Deck
  const handleDeleteDeck = (deckId) => {
    const remaining = deleteDeck(deckId);
    setDecks(remaining);
    if (activeDeck?.id === deckId) {
      setActiveDeck(remaining[0] || null);
    }
  };

  // Total Due Cards across all decks
  const totalDueCards = decks.reduce((acc, d) => {
    return acc + (d.cards ? d.cards.filter(isCardDue).length : 0);
  }, 0);

  return (
    <div className="app-container">
      {/* Floating Capsule Navbar */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAvatarEnabled={isAvatarEnabled}
        toggleAvatar={handleToggleAvatar}
        sensitivity={settings.sensitivity}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={theme}
        toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        dueCardsCount={totalDueCards}
      />

      {/* Main View Area */}
      <main className="main-content">
        {/* VIEW 1: Read & Nudge Mode */}
        {activeTab === 'read' && (
          <div className="reading-layout">
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
            />
          </div>
        )}

        {/* VIEW 2: Flashcard Studio & Curation */}
        {activeTab === 'studio' && (
          <DeckReviewModal 
            deck={activeDeck}
            density={cardDensity}
            onChangeDensity={setCardDensity}
            onRegenerateDeck={(dens) => handleGenerateDeck(dens)}
            onSaveDeck={handleSaveDeck}
            onClose={() => setActiveTab('read')}
          />
        )}

        {/* VIEW 3: SuperMemo SM-2 Spaced Repetition Study Mode */}
        {activeTab === 'study' && (
          <StudyMode 
            deck={activeDeck}
            onUpdateCard={handleUpdateCardReview}
            onFinishSession={() => setActiveTab('decks')}
            onBackToDecks={() => setActiveTab('decks')}
          />
        )}

        {/* VIEW 4: My Decks & Anki Export */}
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

      {/* Checkpoint Comprehension Modal */}
      {activeCheckpointData && (
        <CheckpointModal 
          checkpointData={activeCheckpointData}
          onComplete={handleCheckpointComplete}
          onClose={() => setActiveCheckpointData(null)}
        />
      )}

      {/* Document Upload & CSE Switcher Modal */}
      {isUploadOpen && (
        <UploadModal 
          onSelectDocument={(doc) => {
            setCurrentDoc(doc);
            setActiveTab('read');
            setIsUploadOpen(false);
          }}
          onClose={() => setIsUploadOpen(false)}
        />
      )}

      {/* Preferences & Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal 
          settings={settings}
          onSaveSettings={(newSettings) => {
            setSettings(newSettings);
            saveSettings(newSettings);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
      {/* Global floating AI Tutor - visible across all tabs */}
      <AvatarCompanion 
        isAvatarEnabled={isAvatarEnabled}
        engagementState={engagementState}
        activeNudge={activeNudge}
        onDismissNudge={() => {
          setActiveNudge(null);
          trackerRef.current?.recordNudgeDismissed();
        }}
        onEngageNudge={() => {
          setActiveNudge(null);
          trackerRef.current?.recordNudgeEngaged();
        }}
        onTriggerCheckpoint={() => {
          handleTriggerManualCheckpoint(activeChunkIndex);
        }}
        sensitivity={settings.sensitivity}
        onChangeSensitivity={handleChangeSensitivity}
        telemetry={telemetry}
        activeChunk={chunks[activeChunkIndex]}
        chunks={chunks}
        geminiApiKey={settings.geminiApiKey}
      />
    </div>
  );
}
