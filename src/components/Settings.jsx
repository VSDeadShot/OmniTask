import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X } from 'lucide-react';

export default function Settings({ isOpen, onClose }) {
  const [openAtLogin, setOpenAtLogin] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(25);
  const [shortBreakTime, setShortBreakTime] = useState(5);
  const [longBreakTime, setLongBreakTime] = useState(15);

  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:3001/api/settings')
        .then(res => res.json())
        .then(data => {
          setOpenAtLogin(!!data.openAtLogin);
          if (data.pomodoroTime) setPomodoroTime(data.pomodoroTime);
          if (data.shortBreakTime) setShortBreakTime(data.shortBreakTime);
          if (data.longBreakTime) setLongBreakTime(data.longBreakTime);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleBoot = async (e) => {
    const newValue = e.target.checked;
    setOpenAtLogin(newValue);
    updateSetting('openAtLogin', newValue);
  };

  const updateSetting = async (key, value) => {
    try {
      await fetch('http://localhost:3001/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTimingChange = (setter, key) => (e) => {
    const val = parseInt(e.target.value) || 1;
    setter(val);
    updateSetting(key, val);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="modal-close-btn"
        >
          <X size={20} />
        </button>

        <div className="modal-header">
          <SettingsIcon size={24} className="text-primary" /> Settings
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="settings-row">
            <div className="settings-text">
              <h4>Start on Boot</h4>
              <p>Automatically launch OmniTask in the background when Windows starts.</p>
            </div>
            
            <label className="toggle-switch" style={{marginLeft: '1rem', flexShrink: 0}}>
              <input 
                type="checkbox" 
                checked={openAtLogin} 
                onChange={toggleBoot} 
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Pomodoro Timings (Minutes)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pomodoro</label>
                <input 
                  type="number" 
                  min="1" 
                  value={pomodoroTime} 
                  onChange={handleTimingChange(setPomodoroTime, 'pomodoroTime')}
                  style={{ marginTop: '0.5rem', width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Short Break</label>
                <input 
                  type="number" 
                  min="1" 
                  value={shortBreakTime} 
                  onChange={handleTimingChange(setShortBreakTime, 'shortBreakTime')}
                  style={{ marginTop: '0.5rem', width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Long Break</label>
                <input 
                  type="number" 
                  min="1" 
                  value={longBreakTime} 
                  onChange={handleTimingChange(setLongBreakTime, 'longBreakTime')}
                  style={{ marginTop: '0.5rem', width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.3)' }}
                />
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
