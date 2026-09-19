import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Headphones, 
  Radio, 
  Sparkles,
  Users,
  Mic
} from 'lucide-react';
import { PodcastSpeechEngine } from '../../services/lectureLabService';

/**
 * AudioPodcastPlayer.jsx
 * 
 * 2-Speaker AI Podcast Recap Player:
 * - Alternating speakers: "Alex" (Host) & "Sam" (Co-host)
 * - Built-in speech synthesis using distinct pitches & rates
 * - Visual animated audio frequency bars
 */
export default function AudioPodcastPlayer({ podcast = [] }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const engineRef = useRef(null);

  useEffect(() => {
    engineRef.current = new PodcastSpeechEngine();
    return () => engineRef.current?.stop();
  }, []);

  const handleTogglePlay = () => {
    if (isPlaying) {
      engineRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!engineRef.current) return;
      setIsPlaying(true);
      engineRef.current.playEpisode(
        podcast,
        (idx) => setCurrentLineIndex(idx),
        () => setIsPlaying(false)
      );
    }
  };

  const handleReset = () => {
    engineRef.current?.stop();
    setIsPlaying(false);
    setCurrentLineIndex(0);
  };

  return (
    <div className="podcast-player-card">
      {/* Podcast Banner */}
      <div className="podcast-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="podcast-art-box" style={{ background: 'rgba(127, 29, 58, 0.1)' }}>
            <Radio size={24} color="var(--accent)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="source-tag">AI Podcast Recap</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>2 Co-Hosts (Alex & Sam)</span>
            </div>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.05rem', fontWeight: 800 }}>
              Hands-Free Lecture Audio Breakdown
            </h3>
          </div>
        </div>

        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className="btn btn-primary"
            style={{ borderRadius: '9999px', padding: '8px 18px', gap: '8px' }}
            onClick={handleTogglePlay}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span>{isPlaying ? 'Pause Recap' : 'Listen Now'}</span>
          </button>
          <button className="btn btn-ghost btn-icon" onClick={handleReset} title="Restart episode">
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Animated Waveform Visualizer */}
      {isPlaying && (
        <div className="waveform-bar-container">
          {Array.from({ length: 24 }).map((_, i) => (
            <div 
              key={i} 
              className="waveform-bar"
              style={{
                animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                height: `${20 + (i % 7) * 8}px`
              }} 
            />
          ))}
        </div>
      )}

      {/* Dialogue Stream */}
      <div className="podcast-dialogue-list">
        {podcast.map((line, idx) => {
          const isActive = isPlaying && currentLineIndex === idx;
          const isAlex = line.speaker === "Alex";

          return (
            <div 
              key={idx} 
              className={`podcast-line-row ${isActive ? 'active' : ''} ${isAlex ? 'speaker-alex' : 'speaker-sam'}`}
            >
              <div className="speaker-avatar-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                {isAlex ? (
                  <>
                    <Mic size={12} color="var(--accent)" />
                    <span>Alex</span>
                  </>
                ) : (
                  <>
                    <Headphones size={12} color="var(--accent)" />
                    <span>Sam</span>
                  </>
                )}
              </div>
              <p className="speaker-speech-text">
                {line.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
