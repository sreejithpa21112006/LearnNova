import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  Sparkles,
  Coffee,
  Activity,
  Sliders,
  Eye,
  AlertTriangle,
  Clock,
  X,
  Send,
  MessageCircle,
  ChevronDown,
  Minimize2
} from 'lucide-react';
import { answerWithNLP, answerWithGemini } from '../services/tutorService';

// ─── Floating position constants ──────────────────────────────────────────────
const EDGE_MARGIN = 24;          // px from viewport edges
const BOT_SIZE    = 72;          // avatar button diameter
const DRIFT_INTERVAL = 6000;     // ms between autonomous drift moves
const DRIFT_AMOUNT   = 55;       // max px per drift step

export default function AvatarCompanion({
  isAvatarEnabled,
  engagementState,
  activeNudge,
  onDismissNudge,
  onEngageNudge,
  onTriggerCheckpoint,
  sensitivity,
  onChangeSensitivity,
  telemetry = {},
  activeChunk,
  chunks = [],
  geminiApiKey = ''
}) {
  // ── position / drag state ──────────────────────────────────────────────────
  const [pos, setPos] = useState({ x: window.innerWidth - BOT_SIZE - EDGE_MARGIN, y: window.innerHeight - BOT_SIZE - EDGE_MARGIN - 60 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);

  // ── panel state ────────────────────────────────────────────────────────────
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('chat'); // 'chat' | 'telemetry'

  // ── chat state ─────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasGreeted = useRef(false);

  // ── nudge bubble state (shown near avatar) ─────────────────────────────────
  const [localNudge, setLocalNudge] = useState(null);
  useEffect(() => {
    if (activeNudge) setLocalNudge(activeNudge);
  }, [activeNudge]);

  // ── auto-scroll chat ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── greeting message when panel opens for the first time ──────────────────
  useEffect(() => {
    if (isPanelOpen && !hasGreeted.current && isAvatarEnabled) {
      hasGreeted.current = true;
      const sectionName = activeChunk?.title || 'your document';
      setMessages([{
        role: 'bot',
        text: `Hey! I'm your LearnNova tutor. I'm watching "${sectionName}" with you right now.\n\nAsk me anything about what you're reading — I'll pull the answer straight from the text.`,
        id: Date.now()
      }]);
    }
  }, [isPanelOpen, activeChunk, isAvatarEnabled]);

  // ── greet message updates when active chunk changes ───────────────────────
  const lastGreetedChunk = useRef(null);
  useEffect(() => {
    if (!isPanelOpen || !activeChunk || !isAvatarEnabled) return;
    if (lastGreetedChunk.current === activeChunk.id) return;
    lastGreetedChunk.current = activeChunk.id;
    if (!hasGreeted.current) return;
    setMessages(prev => [
      ...prev,
      {
        role: 'bot',
        text: `Now on: "${activeChunk.title}". Ask me anything about this section.`,
        id: Date.now(),
        small: true
      }
    ]);
  }, [activeChunk, isPanelOpen, isAvatarEnabled]);

  // ── autonomous drift animation ─────────────────────────────────────────────
  useEffect(() => {
    if (isDragging || isPanelOpen) return;

    const drift = setInterval(() => {
      setPos(prev => {
        const maxX = window.innerWidth  - BOT_SIZE - EDGE_MARGIN;
        const maxY = window.innerHeight - BOT_SIZE - EDGE_MARGIN;
        const dx = (Math.random() - 0.5) * DRIFT_AMOUNT;
        const dy = (Math.random() - 0.5) * DRIFT_AMOUNT;
        return {
          x: Math.max(EDGE_MARGIN, Math.min(maxX, prev.x + dx)),
          y: Math.max(EDGE_MARGIN, Math.min(maxY, prev.y + dy))
        };
      });
    }, DRIFT_INTERVAL);

    return () => clearInterval(drift);
  }, [isDragging, isPanelOpen]);

  // ── drag handling ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    hasDragged.current = false;
    dragOffset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => {
      hasDragged.current = true;
      const maxX = window.innerWidth  - BOT_SIZE - EDGE_MARGIN;
      const maxY = window.innerHeight - BOT_SIZE - EDGE_MARGIN;
      setPos({
        x: Math.max(EDGE_MARGIN, Math.min(maxX, e.clientX - dragOffset.current.x)),
        y: Math.max(EDGE_MARGIN, Math.min(maxY, e.clientY - dragOffset.current.y))
      });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',  onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',  onUp);
    };
  }, [isDragging]);

  // ── handle avatar click (toggle panel if not dragging) ────────────────────
  const handleAvatarClick = () => {
    if (hasDragged.current) return;
    setIsPanelOpen(o => !o);
    setLocalNudge(null);
    onDismissNudge?.();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── send chat message ──────────────────────────────────────────────────────
  const handleSend = async () => {
    const question = inputValue.trim();
    if (!question || isTyping) return;

    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: question, id: Date.now() }]);
    setIsTyping(true);

    let answer;
    try {
      const activeIdx = chunks.findIndex(c => c.id === activeChunk?.id);
      const idx = activeIdx >= 0 ? activeIdx : 0;

      if (geminiApiKey) {
        answer = await answerWithGemini(question, chunks, idx, geminiApiKey);
      } else {
        // Small delay to feel natural
        await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
        answer = answerWithNLP(question, chunks, idx);
      }
    } catch {
      answer = "Sorry, something went wrong. Try asking again.";
    }

    setIsTyping(false);
    setMessages(prev => [...prev, { role: 'bot', text: answer, id: Date.now() }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── disabled state ─────────────────────────────────────────────────────────
  if (!isAvatarEnabled) {
    return (
      <div
        style={{
          position: 'fixed',
          left: pos.x,
          top:  pos.y,
          zIndex: 1000,
          cursor: 'grab'
        }}
        onMouseDown={onMouseDown}
      >
        <div style={{
          width: BOT_SIZE, height: BOT_SIZE,
          borderRadius: '50%',
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.45,
          filter: 'grayscale(1)',
          boxShadow: 'var(--shadow)'
        }}>
          <RobotSvg state="disabled" size={42} />
        </div>
      </div>
    );
  }

  const stateClass = engagementState === 'normal' ? 'attentive' : engagementState;
  const dwellSec = telemetry.dwellTimes?.[activeChunk?.index] || 0;
  const expectedDwell = activeChunk?.expectedDwellSeconds || 30;
  const dwellProgress = Math.min(100, Math.round((dwellSec / Math.max(1, expectedDwell)) * 100));

  // Panel position: left of avatar if near right edge, else right
  const panelOnLeft = pos.x > window.innerWidth / 2;
  const panelLeft = panelOnLeft
    ? pos.x - 340 - 12
    : pos.x + BOT_SIZE + 12;
  const panelTop = Math.min(pos.y, window.innerHeight - 540);

  return (
    <>
      {/* ── Nudge bubble near avatar ────────────────────────────────────── */}
      {localNudge && !isPanelOpen && (
        <div
          className="floating-nudge-bubble"
          style={{
            position: 'fixed',
            left: panelOnLeft ? pos.x - 280 - 12 : pos.x + BOT_SIZE + 12,
            top:  pos.y - 10,
            zIndex: 1001
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.83rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.5 }}>
              {localNudge.message}
            </p>
            <button
              onClick={() => { setLocalNudge(null); onDismissNudge?.(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0 }}
            >
              <X size={13} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {localNudge.type !== 'break_suggestion' && (
              <button className="bubble-btn bubble-btn-primary" onClick={() => { setLocalNudge(null); onTriggerCheckpoint(); }}>
                <Sparkles size={11} style={{ marginRight: 3 }} /> Quick Check
              </button>
            )}
            {localNudge.type === 'break_suggestion' && (
              <button className="bubble-btn bubble-btn-primary" onClick={() => { setLocalNudge(null); onEngageNudge?.(); }}>
                <Coffee size={11} style={{ marginRight: 3 }} /> Take a break
              </button>
            )}
            <button className="bubble-btn bubble-btn-ghost" onClick={() => { setLocalNudge(null); onDismissNudge?.(); }}>
              Still reading
            </button>
          </div>
        </div>
      )}

      {/* ── Floating avatar button ──────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          left: pos.x,
          top:  pos.y,
          zIndex: 1002,
          userSelect: 'none'
        }}
        onMouseDown={onMouseDown}
        onClick={handleAvatarClick}
      >
        {/* State ring */}
        <div className={`floating-avatar-ring ${stateClass} ${isPanelOpen ? 'open' : ''}`}>
          <div className="floating-avatar-inner">
            <RobotSvg state={isTyping ? 'typing' : engagementState} size={44} />
          </div>
        </div>

        {/* Unread indicator dot when nudge exists and panel is closed */}
        {localNudge && !isPanelOpen && (
          <span className="floating-avatar-dot" />
        )}

        {/* State label pill */}
        {!isPanelOpen && (
          <div className={`floating-avatar-label ${stateClass}`}>
            {engagementState === 'normal'   && <Eye size={9} />}
            {engagementState === 'skimming' && <AlertTriangle size={9} />}
            {engagementState === 'idle'     && <Clock size={9} />}
            {engagementState === 'away'     && <Coffee size={9} />}
            <span>
              {engagementState === 'normal'   ? 'Watching' :
               engagementState === 'skimming' ? 'Skim!' :
               engagementState === 'idle'     ? 'Idle' : 'Away'}
            </span>
          </div>
        )}
      </div>

      {/* ── Sliding chat + telemetry panel ─────────────────────────────── */}
      {isPanelOpen && (
        <div
          className="floating-tutor-panel"
          style={{ left: panelLeft, top: panelTop }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          {/* Panel header */}
          <div className="floating-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center' }}>
                <RobotSvg state={engagementState} size={28} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>LearnNova Tutor</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                  {geminiApiKey ? 'Gemini AI' : 'NLP mode'} &mdash; ask anything about the text
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {/* Tab switcher */}
              <button
                className={`panel-tab-btn ${activePanel === 'chat' ? 'active' : ''}`}
                onClick={() => setActivePanel('chat')}
                title="Chat"
              >
                <MessageCircle size={13} />
              </button>
              <button
                className={`panel-tab-btn ${activePanel === 'telemetry' ? 'active' : ''}`}
                onClick={() => setActivePanel('telemetry')}
                title="Telemetry"
              >
                <Activity size={13} />
              </button>
              <button
                className="panel-tab-btn"
                onClick={() => setIsPanelOpen(false)}
                title="Close"
              >
                <Minimize2 size={13} />
              </button>
            </div>
          </div>

          {/* ── Chat panel ──────────────────────────────────────────────── */}
          {activePanel === 'chat' && (
            <>
              <div className="tutor-chat-messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`tutor-msg ${msg.role} ${msg.small ? 'small' : ''}`}>
                    {msg.role === 'bot' && (
                      <div className="tutor-msg-avatar">
                        <Bot size={12} />
                      </div>
                    )}
                    <div className="tutor-msg-bubble">
                      {msg.text.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < msg.text.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="tutor-msg bot">
                    <div className="tutor-msg-avatar"><Bot size={12} /></div>
                    <div className="tutor-msg-bubble tutor-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested quick questions */}
              {messages.length <= 1 && activeChunk && (
                <div className="tutor-suggestions">
                  {[
                    `What is the main idea of this section?`,
                    activeChunk.keyTerms?.[0] ? `Explain "${activeChunk.keyTerms[0]}"` : null,
                    `Why does this matter?`
                  ].filter(Boolean).map((q, i) => (
                    <button
                      key={i}
                      className="tutor-suggestion-chip"
                      onClick={() => { setInputValue(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input row */}
              <div className="tutor-input-row">
                <textarea
                  ref={inputRef}
                  className="tutor-input"
                  placeholder="Ask about what you're reading..."
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={isTyping}
                />
                <button
                  className={`tutor-send-btn ${isTyping || !inputValue.trim() ? 'disabled' : ''}`}
                  onClick={handleSend}
                  disabled={isTyping || !inputValue.trim()}
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}

          {/* ── Telemetry panel ──────────────────────────────────────────── */}
          {activePanel === 'telemetry' && (
            <div className="tutor-telemetry-body">
              <div className="telemetry-title">
                <span>Reading Telemetry</span>
                <Activity size={13} color="var(--accent)" />
              </div>

              <div className="telemetry-row">
                <span style={{ color: 'var(--text-2)' }}>Section dwell</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="dwell-mini-bar" style={{ width: '60px' }}>
                    <div
                      className="dwell-mini-fill"
                      style={{
                        width: `${dwellProgress}%`,
                        background: dwellProgress >= 80 ? 'var(--green)' : 'var(--accent)'
                      }}
                    />
                  </div>
                  <span className="telemetry-val">{dwellSec}s / {expectedDwell}s</span>
                </div>
              </div>

              <div className="telemetry-row">
                <span style={{ color: 'var(--text-2)' }}>Scroll speed</span>
                <span
                  className="telemetry-val"
                  style={{ color: (telemetry.scrollVelocity || 0) > 400 ? 'var(--amber)' : undefined }}
                >
                  {telemetry.scrollVelocity || 0} px/s
                </span>
              </div>

              <div className="telemetry-row">
                <span style={{ color: 'var(--text-2)' }}>Idle timer</span>
                <span className="telemetry-val">{telemetry.idleSeconds || 0}s</span>
              </div>

              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sliders size={11} /> Sensitivity
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['low', 'medium', 'high'].map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => onChangeSensitivity(lvl)}
                      style={{
                        flex: 1,
                        padding: '5px 0',
                        borderRadius: 'var(--r-pill)',
                        border: '1px solid',
                        borderColor: sensitivity === lvl ? 'var(--accent)' : 'var(--border)',
                        background: sensitivity === lvl ? 'var(--accent-bg)' : 'transparent',
                        color: sensitivity === lvl ? 'var(--accent)' : 'var(--text-3)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        transition: 'all .15s'
                      }}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '12px', justifyContent: 'center', fontSize: '0.8rem' }}
                onClick={() => onTriggerCheckpoint?.()}
              >
                <Sparkles size={13} /> Run Section Checkpoint
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Robot SVG ────────────────────────────────────────────────────────────────
function RobotSvg({ state = 'normal', size = 44 }) {
  const isSkimming = state === 'skimming';
  const isIdle     = state === 'idle';
  const isAway     = state === 'away' || state === 'disabled';
  const isTyping   = state === 'typing';

  return (
    <svg viewBox="0 0 140 140" width={size} height={size} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <radialGradient id="sg2" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#000" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bg2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e4e4e7" />
        </linearGradient>
        <linearGradient id="sc2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="cap2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>

      <ellipse cx="70" cy="132" rx="34" ry="5" fill="url(#sg2)" />

      {/* Antenna */}
      <line x1="70" y1="28" x2="70" y2="15" stroke="#a1a1aa" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="70" cy="14" r="5.5" fill={isSkimming ? '#d97706' : isTyping ? '#4ade80' : '#4f46e5'} />
      <circle cx="70" cy="14" r="2.5" fill="#ffffff" />

      {/* Head */}
      <rect x="30" y="28" width="80" height="74" rx="22" fill="url(#bg2)" stroke="#d4d4d8" strokeWidth="2" />
      <rect x="38" y="38" width="64" height="48" rx="12" fill="url(#sc2)" stroke="#27272a" strokeWidth="1.5" />

      {/* Eyes */}
      {isTyping ? (
        <g>
          <circle cx="56" cy="62" r="6" fill="#4ade80" />
          <circle cx="84" cy="62" r="6" fill="#4ade80" />
          <path d="M63 72 Q70 68 77 72" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      ) : isSkimming ? (
        <g>
          <circle cx="56" cy="62" r="8.5" fill="#d97706" />
          <circle cx="56" cy="62" r="3.5" fill="#fff" />
          <circle cx="84" cy="62" r="8.5" fill="#d97706" />
          <circle cx="84" cy="62" r="3.5" fill="#fff" />
        </g>
      ) : isIdle ? (
        <g>
          <path d="M48 65 Q56 59 64 65" stroke="#8b5cf6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M76 65 Q84 59 92 65" stroke="#8b5cf6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <text x="94" y="46" fill="#8b5cf6" fontSize="12" fontWeight="bold" fontFamily="sans-serif">z</text>
        </g>
      ) : isAway ? (
        <g>
          <line x1="48" y1="62" x2="64" y2="62" stroke="#71717a" strokeWidth="3" strokeLinecap="round" />
          <line x1="76" y1="62" x2="92" y2="62" stroke="#71717a" strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <circle cx="56" cy="62" r="8" fill="#16a34a" />
          <circle cx="58" cy="60" r="3" fill="#fff" />
          <circle cx="84" cy="62" r="8" fill="#16a34a" />
          <circle cx="86" cy="60" r="3" fill="#fff" />
          <path d="M63 73 Q70 77 77 73" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" fill="none" />
        </g>
      )}

      {/* Graduation cap */}
      <g transform="translate(18, 12) rotate(-8 70 20)">
        <polygon points="50,16 85,6 120,16 85,26" fill="url(#cap2)" stroke="#312e81" strokeWidth="1.5" />
        <path d="M65,22 Q85,32 105,22 L103,26 Q85,36 67,26 Z" fill="#3730a3" />
        <line x1="85" y1="16" x2="114" y2="28" stroke="#f59e0b" strokeWidth="1.5" />
        <circle cx="114" cy="29" r="2.5" fill="#f59e0b" />
      </g>

      {/* Hands */}
      <circle cx="22" cy="74" r="7.5" fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="1.5" />
      <circle cx="118" cy="74" r="7.5" fill="#e4e4e7" stroke="#a1a1aa" strokeWidth="1.5" />
    </svg>
  );
}
