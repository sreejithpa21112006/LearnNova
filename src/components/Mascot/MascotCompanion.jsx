import React, { useState, useEffect, useRef } from 'react';
import MascotSvg from './MascotSvg';
import { speakMascotVoice } from '../../services/tutorService';
import { Volume2, VolumeX, Sparkles, X, MessageSquare, PhoneCall } from 'lucide-react';

/**
 * MascotCompanion.jsx
 * 
 * Interactive Duolingo & StudyFetch Mascot ("Sparky / Nova")
 * - Features animated speech bubbles with voice synthesis
 * - Reacts to reading speed, correct quiz answers, streaks, and idle states
 * - Interactive micro-dialogue and high-fives
 */
export default function MascotCompanion({
  engagementState = 'normal',
  activeNudge = null,
  onDismissNudge,
  onTriggerCheckpoint,
  onOpenChat,
  skin = 'sparky-pup',
  voiceEnabled = false,
  onToggleVoice
}) {
  const [mascotState, setMascotState] = useState('normal');
  const [bubbleMessage, setBubbleMessage] = useState(null);
  const [isHighFived, setIsHighFived] = useState(false);
  const speechTimeoutRef = useRef(null);

  // Sync mascot state with engagement
  useEffect(() => {
    if (activeNudge) {
      setMascotState('nudge');
      setBubbleMessage(activeNudge.message || "Hey! Let's slow down and lock this concept into memory.");
      if (voiceEnabled) speakMascotVoice(activeNudge.message, true);
    } else if (engagementState === 'skimming') {
      setMascotState('nudge');
      setBubbleMessage("Whoa, fast reader! Did you catch that key theorem?");
    } else if (engagementState === 'idle' || engagementState === 'away') {
      setMascotState('sleep');
      setBubbleMessage("Zzz... Taking a quick study break? I'm here when you're ready!");
    } else if (isHighFived) {
      setMascotState('cheering');
      setBubbleMessage("High five! You're crushing this study session!");
    } else {
      setMascotState('normal');
    }
  }, [engagementState, activeNudge, isHighFived, voiceEnabled]);

  const handleHighFive = () => {
    setIsHighFived(true);
    if (voiceEnabled) speakMascotVoice("High five! Awesome study focus!", true);
    setTimeout(() => {
      setIsHighFived(false);
      setBubbleMessage(null);
    }, 4000);
  };

  const handleMascotClick = () => {
    if (mascotState === 'sleep') {
      // Wake up with surprise
      setMascotState('normal');
      setBubbleMessage("I'm awake! Ready to study!");
      if (voiceEnabled) speakMascotVoice("I'm awake! Let's learn!", true);
    } else {
      onOpenChat?.();
    }
  };

  return (
    <div className="mascot-floating-container">
      {/* Interactive Speech Bubble */}
      {bubbleMessage && (
        <div className="mascot-speech-bubble">
          <button 
            className="mascot-bubble-close" 
            onClick={() => {
              setBubbleMessage(null);
              onDismissNudge?.();
            }}
          >
            <X size={12} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--accent)' }}>
              {skin === 'sparky-pup' ? 'Sparky' : 'Nova'}
            </span>
            <button
              onClick={onToggleVoice}
              title={voiceEnabled ? "Mute Voice Speech" : "Enable Voice Speech"}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-3)' }}
            >
              {voiceEnabled ? <Volume2 size={13} color="var(--accent)" /> : <VolumeX size={13} />}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.45, color: 'var(--text)' }}>
            {bubbleMessage}
          </p>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            {onTriggerCheckpoint && (
              <button 
                className="btn btn-primary" 
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                onClick={() => {
                  setBubbleMessage(null);
                  onTriggerCheckpoint();
                }}
              >
                <Sparkles size={11} /> Test Me
              </button>
            )}
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              onClick={handleHighFive}
            >
              <Sparkles size={11} color="var(--accent)" />
              <span>High Five!</span>
            </button>
          </div>
        </div>
      )}

      {/* Mascot Animated Character */}
      <div 
        className="mascot-avatar-button" 
        onClick={handleMascotClick}
        title="Click to chat with your AI Tutor!"
      >
        <MascotSvg state={mascotState} size={64} skin={skin} />
      </div>
    </div>
  );
}
