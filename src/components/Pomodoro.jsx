import { useState, useEffect } from 'react';

const MODES = {
  pomodoro: { time: 25 * 60, label: 'Pomodoro', color: '#f43f5e', shadow: 'rgba(244, 63, 94, 0.2)' },
  shortBreak: { time: 5 * 60, label: 'Short Break', color: '#10b981', shadow: 'rgba(16, 185, 129, 0.2)' },
  longBreak: { time: 15 * 60, label: 'Long Break', color: '#3b82f6', shadow: 'rgba(59, 130, 246, 0.2)' }
};

export default function Pomodoro() {
  const [mode, setMode] = useState('pomodoro');
  const [timeLeft, setTimeLeft] = useState(MODES.pomodoro.time);
  const [isActive, setIsActive] = useState(false);
  const [session, setSession] = useState(1);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      if (Notification.permission === 'granted') {
        new Notification('Time is up!', {
          body: `Your ${MODES[mode].label} session is over.`
        });
      }
      
      // Auto switch logic
      if (mode === 'pomodoro') {
        if (session % 4 === 0) {
          switchMode('longBreak');
        } else {
          switchMode('shortBreak');
        }
      } else {
        setSession(s => s + 1);
        switchMode('pomodoro');
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, session]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setTimeLeft(MODES[newMode].time);
    setIsActive(false);
  };

  const toggleTimer = () => {
    if (!isActive && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    setIsActive(!isActive);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStatusText = () => {
    if (mode === 'pomodoro') return 'Time to focus!';
    return 'Time for a break!';
  };

  return (
    <div className="focus-view-container" style={{ width: '100%' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div 
          className="pomodoro-card glass-panel" 
          style={{ 
            boxShadow: `0 0 40px ${MODES[mode].shadow}`,
            borderColor: MODES[mode].color,
            borderWidth: '1px'
          }}
        >
          <div className="pomodoro-tabs">
            {Object.keys(MODES).map((m) => (
              <button 
                key={m}
                className={`pomodoro-tab ${mode === m ? 'active' : ''}`}
                style={{ 
                  backgroundColor: mode === m ? MODES[m].color : 'transparent',
                  color: mode === m ? 'white' : 'var(--text-muted)'
                }}
                onClick={() => switchMode(m)}
              >
                {MODES[m].label}
              </button>
            ))}
          </div>

          <div className="pomodoro-timer" style={{ color: MODES[mode].color, textShadow: `0 0 20px ${MODES[mode].shadow}` }}>
            {formatTime(timeLeft)}
          </div>

          <button 
            className="pomodoro-start-btn"
            style={{ 
              backgroundColor: isActive ? 'transparent' : MODES[mode].color,
              color: isActive ? MODES[mode].color : 'white',
              border: `2px solid ${MODES[mode].color}`,
              boxShadow: isActive ? 'none' : `0 4px 20px ${MODES[mode].shadow}`
            }}
            onClick={toggleTimer}
          >
            {isActive ? 'PAUSE' : 'START'}
          </button>
        </div>

        <div className="pomodoro-status-text text-center">
          <div style={{ color: MODES[mode].color, fontWeight: 'bold' }}>#{session}</div>
          <div>{getStatusText()}</div>
        </div>
      </div>
    </div>
  );
}
