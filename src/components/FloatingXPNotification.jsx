import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, Flame, Award } from 'lucide-react';
import { subscribeToRewards } from '../services/gamificationService';

export default function FloatingXPNotification() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToRewards((reward) => {
      setNotifications(prev => [...prev.slice(-3), reward]); // keep max 4 simultaneously

      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== reward.id));
      }, 2600);
    });

    return unsubscribe;
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="xp-notification-container">
      {notifications.map(notif => (
        <div 
          key={notif.id} 
          className={`xp-notification-pill ${notif.leveledUp ? 'leveled-up' : ''}`}
        >
          <div className="xp-pill-icon">
            {notif.leveledUp ? (
              <Award size={18} color="var(--accent)" />
            ) : notif.reason.toLowerCase().includes('streak') ? (
              <Flame size={18} color="var(--accent)" />
            ) : (
              <Zap size={18} color="var(--accent)" />
            )}
          </div>
          <div className="xp-pill-text">
            <span className="xp-pill-reason">{notif.reason}</span>
            {notif.leveledUp && (
              <span className="xp-pill-sub">
                Level {notif.levelInfo.level} Unlocked: {notif.levelInfo.title}!
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
