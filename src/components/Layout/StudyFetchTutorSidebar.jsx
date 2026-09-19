import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Sparkles, 
  PhoneCall, 
  PhoneOff, 
  X, 
  Plus, 
  Compass, 
  Layers, 
  BookOpen, 
  Volume2, 
  VolumeX, 
  HelpCircle,
  ChevronDown,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Award,
  Brain,
  Lightbulb,
  Zap,
  Target,
  FileText,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import MascotSvg from '../Mascot/MascotSvg';
import { generateInteractiveCopilotResponse, speakMascotVoice } from '../../services/tutorService';
import { saveStudyActivity } from '../../services/storageService';
import { awardXp } from '../../services/gamificationService';

/**
 * StudyFetchTutorSidebar.jsx
 * 
 * Deeply Interactive AI Tutor & Copilot ("Sparky / Nova"):
 * - Handles interactive pedagogical requests: "challenge me", "explain simply", "flashcards", "summarize"
 * - In-chat interactive diagnostic challenge cards with instant option clicks, confetti & XP!
 * - In-chat interactive flashcard drills with flip & rating
 * - Suggested action chips below answers
 * - Guided Mode drawer with 1-click prompts
 * - Voice Call integration with speech synthesis
 * - Automatically logs completed challenges to user's study history!
 */
export default function StudyFetchTutorSidebar({
  isOpen,
  onClose,
  currentDoc,
  chunks = [],
  activeChunkIndex = 0,
  geminiApiKey = '',
  mascotSkin = 'sparky-pup',
  voiceEnabled = true,
  onToggleVoice,
  onTriggerGenerateFlashcards,
  onTriggerStudyPlan
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('friendly'); // 'friendly' | 'socratic' | 'professor' | 'eli5'
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isGuidedMode, setIsGuidedMode] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('characters'); // 'characters' | 'plugins'

  // Card & Challenge interaction state in chat
  const [answeredChallenges, setAnsweredChallenges] = useState({}); // { [msgId]: { selectedIndex, isCorrect } }
  const [flippedCards, setFlippedCards] = useState({}); // { [msgId]: boolean }

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, answeredChallenges, flippedCards]);

  const quickChips = [
    { label: "Challenge me on this section", icon: Target, action: "challenge me" },
    { label: "Explain simply (ELI5)", icon: HelpCircle, action: "explain simply" },
    { label: "Quick flashcard drill", icon: Layers, action: "flashcards" },
    { label: "Key takeaways & summary", icon: FileText, action: "summarize" },
    { label: "Generate full flashcard deck", icon: Sparkles, action: "cards" }
  ];

  const handleChipClick = async (chip) => {
    if (chip.action === 'cards') {
      onTriggerGenerateFlashcards?.();
      setMessages(prev => [
        ...prev,
        { role: 'user', text: chip.label, id: Date.now() },
        { role: 'bot', type: 'text', text: "Done! I've analyzed your document and synthesized flashcards in your Card Studio. Switch to the Card Studio tab anytime to review them!", id: Date.now() + 1 }
      ]);
      return;
    }

    if (chip.action === 'plan') {
      onTriggerStudyPlan?.();
      setMessages(prev => [
        ...prev,
        { role: 'user', text: chip.label, id: Date.now() },
        { role: 'bot', type: 'text', text: "I generated a customized Study Plan for you! Foundations first, with diagnostic checkpoints so you can skip topics you've already mastered.", id: Date.now() + 1 }
      ]);
      return;
    }

    handleSendMessage(chip.action || chip.label);
  };

  const handleSendMessage = async (textToSend = null) => {
    const query = textToSend || inputValue.trim();
    if (!query || isTyping) return;

    setInputValue('');
    setShowPlusMenu(false);
    const userMsgId = Date.now();
    setMessages(prev => [...prev, { role: 'user', text: query, id: userMsgId }]);
    setIsTyping(true);

    try {
      // Use rich interactive pedagogical generator
      const response = await generateInteractiveCopilotResponse({
        query,
        chunks,
        activeChunkIndex,
        apiKey: geminiApiKey,
        persona: selectedPersona
      });

      const botMsgId = Date.now() + 1;
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          id: botMsgId,
          ...response
        }
      ]);

      // Voice mascot line if audio enabled or active voice call
      if (voiceEnabled || isVoiceCallActive) {
        const spokenText = response.intro || (typeof response.text === 'string' ? response.text.replace(/[•*#]/g, '') : '');
        if (spokenText) speakMascotVoice(spokenText, true);
      }
    } catch (e) {
      console.warn("Tutor response error:", e);
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          id: Date.now() + 1,
          type: 'text',
          text: `I'm here to help! Try asking me to **"challenge me"** on your notes or **"explain simply"**!`,
          suggestedActions: [
            { label: "Challenge Me", action: "challenge me" },
            { label: "Explain Simply", action: "explain simply" }
          ]
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle in-chat interactive challenge answer click
  const handleAnswerChallenge = (msgId, challenge, optionIdx) => {
    if (answeredChallenges[msgId]) return; // Already answered

    const isCorrect = optionIdx === challenge.correctIndex;
    setAnsweredChallenges(prev => ({
      ...prev,
      [msgId]: { selectedIndex: optionIdx, isCorrect }
    }));

    if (isCorrect) {
      try {
        confetti({
          particleCount: 55,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      awardXp('checkpoint_correct', 15, '+15 XP Challenge Correct!');
      if (voiceEnabled || isVoiceCallActive) {
        speakMascotVoice("Awesome job! That's correct!", true);
      }
    } else {
      if (voiceEnabled || isVoiceCallActive) {
        speakMascotVoice("Good try! Check the explanation to master this concept.", true);
      }
    }

    // Auto-log to user's study history so it can be traced back!
    saveStudyActivity({
      type: 'copilot_challenge',
      title: `Copilot Challenge: ${challenge.chunkTitle || 'Section Review'}`,
      subtitle: isCorrect ? 'Mastered in Copilot Drill' : 'Reviewed in Copilot Drill',
      question: challenge.question,
      selectedOption: challenge.options[optionIdx],
      correctOption: challenge.options[challenge.correctIndex],
      isCorrect,
      explanation: challenge.explanation,
      chunkIndex: challenge.chunkIndex ?? activeChunkIndex,
      xpEarned: isCorrect ? 15 : 5
    });
  };

  // Handle in-chat flashcard flip & recall rating
  const handleRateFlashcard = (msgId, card, known) => {
    if (known) {
      awardXp('card_review', 8, '+8 XP Flashcard Mastered!');
      if (voiceEnabled || isVoiceCallActive) {
        speakMascotVoice("Solid recall!", true);
      }
    }

    // Log to study history
    saveStudyActivity({
      type: 'flashcard',
      title: card.question.slice(0, 45) + (card.question.length > 45 ? '...' : ''),
      subtitle: `Copilot Card Drill • ${card.chunkTitle || 'Active Notes'}`,
      question: card.question,
      userAnswer: known ? 'Self-evaluated: Recalled' : 'Self-evaluated: Needs Review',
      targetAnswer: card.answer,
      aiScore: known ? 92 : 45,
      aiVerdict: known ? 'Concept Recalled' : 'Review Suggested',
      aiFeedback: known ? 'Good active recall on this key term!' : 'Keep revisiting this definition in Card Studio.',
      grade: known ? 3 : 1,
      gradeLabel: known ? 'Good' : 'Again',
      algorithm: 'fsrs',
      xpEarned: known ? 8 : 2
    });

    // Send acknowledgement
    setMessages(prev => [
      ...prev,
      {
        role: 'bot',
        id: Date.now(),
        type: 'text',
        text: known 
          ? "Great memory! Logged to your Study History (+8 XP). Ready for another?" 
          : "No problem! I've noted this in your Study History so you can review it again soon.",
        suggestedActions: [
          { label: "Another Flashcard", action: "flashcards" },
          { label: "Challenge Me", action: "challenge me" }
        ]
      }
    ]);
  };

  const toggleVoiceCall = () => {
    if (isVoiceCallActive) {
      setIsVoiceCallActive(false);
      speakMascotVoice("Call ended. Keep up the great studying!", true);
    } else {
      setIsVoiceCallActive(true);
      speakMascotVoice("Hey! I'm on call with you now. Ask me anything about your notes or say challenge me and I'll test you live!", true);
      setMessages(prev => [
        ...prev,
        { role: 'bot', type: 'text', text: "Live voice call started! I am listening and will speak answers and challenges aloud directly to you.", id: Date.now() }
      ]);
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="studyfetch-tutor-sidebar">
      {/* Top Header */}
      <div className="tutor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
            {mascotSkin === 'sparky-pup' ? 'Sparky' : 'Nova'} Copilot
          </span>
          <span className="tutor-badge-online">Online</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button 
            className="btn btn-ghost btn-icon"
            onClick={onToggleVoice}
            title={voiceEnabled ? "Voice Speech ON" : "Voice Speech Muted"}
          >
            {voiceEnabled ? <Volume2 size={15} color="var(--accent)" /> : <VolumeX size={15} />}
          </button>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close Tutor Sidebar">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Mascot & Initial Prompts Area */}
      <div className="tutor-scrollable-content">
        {messages.length === 0 && (
          <div className="tutor-welcome-box">
            <div className="tutor-mascot-wrapper">
              <MascotSvg state={isVoiceCallActive ? 'calling' : 'normal'} size={72} skin={mascotSkin} />
            </div>
            <h3 className="tutor-greeting">How can I help?</h3>

            {/* Quick Prompt Chips */}
            <div className="tutor-chips-stack">
              {quickChips.map((chip, idx) => {
                const IconComp = chip.icon;
                return (
                  <button
                    key={idx}
                    className="tutor-chip"
                    onClick={() => handleChipClick(chip)}
                  >
                    <span className="chip-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <IconComp size={15} color="var(--accent)" />
                    </span>
                    <span className="chip-text">{chip.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-Tabs: Characters & Plugins */}
            <div className="tutor-mode-switcher">
              <button 
                className={`mode-pill ${activeTab === 'characters' ? 'active' : ''}`}
                onClick={() => setActiveTab('characters')}
              >
                Characters
              </button>
              <button 
                className={`mode-pill ${activeTab === 'plugins' ? 'active' : ''}`}
                onClick={() => setActiveTab('plugins')}
              >
                Plugins
              </button>
            </div>

            {activeTab === 'characters' && (
              <div className="persona-selector-grid">
                {[
                  { id: 'friendly', name: 'Friendly Copilot', desc: 'Encouraging & adaptive' },
                  { id: 'socratic', name: 'Socratic Tutor', desc: 'Challenges with questions' },
                  { id: 'professor', name: 'Professor', desc: 'Formal academic rigor' },
                  { id: 'eli5', name: 'ELI5 Explainer', desc: 'Simple intuitive models' }
                ].map(p => (
                  <button
                    key={p.id}
                    className={`persona-btn ${selectedPersona === p.id ? 'active' : ''}`}
                    onClick={() => setSelectedPersona(p.id)}
                  >
                    <span className="persona-name">{p.name}</span>
                    <span className="persona-desc">{p.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Feed */}
        {messages.length > 0 && (
          <div className="tutor-messages-stream">
            {messages.map(msg => (
              <div key={msg.id} className={`tutor-chat-msg ${msg.role}`}>
                {msg.role === 'bot' && (
                  <div className="msg-avatar-icon">
                    <MascotSvg state="normal" size={24} skin={mascotSkin} />
                  </div>
                )}

                <div className="msg-bubble-container" style={{ maxWidth: '85%' }}>
                  {/* Text bubble or intro */}
                  {msg.intro && (
                    <div className="msg-bubble" style={{ marginBottom: '8px' }}>
                      {msg.intro}
                    </div>
                  )}

                  {msg.text && (
                    <div className="msg-bubble" style={{ whiteSpace: 'pre-line' }}>
                      {msg.text}
                    </div>
                  )}

                  {/* 1. Interactive Challenge Card in Chat */}
                  {msg.type === 'challenge' && msg.challenge && (
                    <div className="inchat-challenge-card">
                      <div className="inchat-card-header">
                        <span className="inchat-pill">
                          <Brain size={12} /> Interactive Challenge
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
                          +15 XP
                        </span>
                      </div>

                      <h4 className="inchat-question-text">
                        {msg.challenge.question}
                      </h4>

                      <div className="inchat-options-stack">
                        {msg.challenge.options.map((opt, optIdx) => {
                          const state = answeredChallenges[msg.id];
                          const hasAnswered = !!state;
                          const isSelected = state?.selectedIndex === optIdx;
                          const isCorrect = optIdx === msg.challenge.correctIndex;

                          let btnClass = 'inchat-opt-btn';
                          if (hasAnswered) {
                            if (isCorrect) btnClass += ' opt-correct';
                            else if (isSelected) btnClass += ' opt-wrong';
                          }

                          return (
                            <button
                              key={optIdx}
                              className={btnClass}
                              disabled={hasAnswered}
                              onClick={() => handleAnswerChallenge(msg.id, msg.challenge, optIdx)}
                            >
                              <span className="opt-marker">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span style={{ flex: 1, textAlign: 'left' }}>{opt}</span>
                              {hasAnswered && isCorrect && <CheckCircle2 size={14} color="#10b981" />}
                              {hasAnswered && isSelected && !isCorrect && <XCircle size={14} color="#ef4444" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation and next actions */}
                      {answeredChallenges[msg.id] && (
                        <div className="inchat-feedback-box">
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-2)', marginBottom: '8px', lineHeight: 1.4 }}>
                            <strong>Explanation:</strong> {msg.challenge.explanation}
                          </div>

                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => handleSendMessage('challenge me')}
                            >
                              <Zap size={12} /> Next Challenge
                            </button>
                            <button 
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleSendMessage('explain simply')}
                            >
                              <Lightbulb size={12} /> Explain Concept
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Interactive Flashcard Drill in Chat */}
                  {msg.type === 'flashcard' && msg.card && (
                    <div className="inchat-challenge-card">
                      <div className="inchat-card-header">
                        <span className="inchat-pill">
                          <Layers size={12} /> Active Recall Flashcard
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>
                          +8 XP
                        </span>
                      </div>

                      <h4 className="inchat-question-text">
                        {msg.card.question}
                      </h4>

                      {!flippedCards[msg.id] ? (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ width: '100%', marginTop: '6px' }}
                          onClick={() => setFlippedCards(prev => ({ ...prev, [msg.id]: true }))}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Eye size={13} color="var(--accent)" /> Reveal Answer
                          </span>
                        </button>
                      ) : (
                        <div className="inchat-feedback-box">
                          <div style={{ fontSize: '0.8rem', color: 'var(--text)', marginBottom: '10px', lineHeight: 1.4 }}>
                            <strong>Answer:</strong> {msg.card.answer}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn btn-sm btn-primary" 
                              onClick={() => handleGradeFlashcardInChat(msg.id, msg.card, true)}
                            >
                              <CheckCircle2 size={13} /> I Knew It (+8 XP)
                            </button>
                            <button 
                              className="btn btn-sm btn-secondary" 
                              onClick={() => handleGradeFlashcardInChat(msg.id, msg.card, false)}
                            >
                              <XCircle size={13} /> Forgot (+2 XP)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Suggested Action Chips below responses */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {msg.suggestedActions.map((act, actIdx) => (
                        <button
                          key={actIdx}
                          className="inchat-action-pill"
                          onClick={() => handleSendMessage(act.action)}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="tutor-chat-msg bot">
                <div className="msg-avatar-icon">
                  <MascotSvg state="thinking" size={24} skin={mascotSkin} />
                </div>
                <div className="msg-bubble typing-dots">
                  <span>●</span> <span>●</span> <span>●</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Interactive Guided Action Tray (when Guided is toggled) */}
      {isGuidedMode && (
        <div className="guided-actions-tray">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>
              <Compass size={12} color="var(--accent)" />
              <span>Guided Study Prompts</span>
            </span>
            <button 
              className="btn btn-ghost btn-icon" 
              style={{ width: '18px', height: '18px' }}
              onClick={() => setIsGuidedMode(false)}
            >
              <X size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button 
              className="inchat-action-pill highlight"
              onClick={() => handleSendMessage('challenge me')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Target size={12} color="var(--accent)" />
              <span>Challenge Me</span>
            </button>
            <button 
              className="inchat-action-pill"
              onClick={() => handleSendMessage('explain simply')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <HelpCircle size={12} color="var(--accent)" />
              <span>Explain Simply</span>
            </button>
            <button 
              className="inchat-action-pill"
              onClick={() => handleSendMessage('flashcards')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Layers size={12} color="var(--accent)" />
              <span>Flashcard Drill</span>
            </button>
            <button 
              className="inchat-action-pill"
              onClick={() => handleSendMessage('summarize')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <FileText size={12} color="var(--accent)" />
              <span>Summarize</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Input Area matching StudyFetch screenshot */}
      <div className="tutor-bottom-panel">
        {/* Plus Menu Popup */}
        {showPlusMenu && (
          <div className="plus-popover-menu">
            <button 
              className="plus-menu-item"
              onClick={() => { setShowPlusMenu(false); handleSendMessage('challenge me'); }}
            >
              <Brain size={14} color="var(--accent)" />
              <span>Diagnostic Challenge Question</span>
            </button>
            <button 
              className="plus-menu-item"
              onClick={() => { setShowPlusMenu(false); handleSendMessage('flashcards'); }}
            >
              <Layers size={14} color="var(--accent)" />
              <span>Quick Flashcard Drill</span>
            </button>
            <button 
              className="plus-menu-item"
              onClick={() => { setShowPlusMenu(false); handleSendMessage('explain simply'); }}
            >
              <Lightbulb size={14} color="var(--accent)" />
              <span>Explain in Simple Terms (ELI5)</span>
            </button>
            <button 
              className="plus-menu-item"
              onClick={() => { setShowPlusMenu(false); handleSendMessage('summarize'); }}
            >
              <BookOpen size={14} color="var(--accent)" />
              <span>Summarize Active Section</span>
            </button>
          </div>
        )}

        <form 
          className="tutor-input-box"
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
        >
          <input
            ref={inputRef}
            type="text"
            className="tutor-text-input"
            placeholder="Ask your AI tutor anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button 
            type="submit" 
            className="tutor-send-btn" 
            disabled={!inputValue.trim() || isTyping}
            title="Send Question"
          >
            <Send size={14} />
          </button>
        </form>

        {/* Actions bar: +, Guided, Call */}
        <div className="tutor-action-bar">
          <button 
            type="button"
            className={`tutor-aux-btn ${showPlusMenu ? 'active' : ''}`}
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            title="Study Prompts & Tools"
          >
            <Plus size={14} />
          </button>

          <button 
            type="button"
            className={`tutor-aux-btn guided-btn ${isGuidedMode ? 'active' : ''}`}
            onClick={() => setIsGuidedMode(!isGuidedMode)}
            title="Guided study walkthrough"
          >
            <Compass size={13} />
            <span>Guided</span>
          </button>

          {/* Call button matching screenshot */}
          <button 
            type="button"
            className={`tutor-call-btn ${isVoiceCallActive ? 'calling' : ''}`}
            onClick={toggleVoiceCall}
            title={isVoiceCallActive ? "Hang up live voice call" : "Start live voice call with AI tutor"}
          >
            {isVoiceCallActive ? <PhoneOff size={13} /> : <PhoneCall size={13} />}
            <span>{isVoiceCallActive ? 'End Call' : 'Call'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
