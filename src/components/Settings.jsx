import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, X } from 'lucide-react';

export default function Settings({ isOpen, onClose }) {
  const [openAtLogin, setOpenAtLogin] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:3001/api/settings')
        .then(res => res.json())
        .then(data => setOpenAtLogin(!!data.openAtLogin))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleBoot = async (e) => {
    const newValue = e.target.checked;
    setOpenAtLogin(newValue);
    try {
      await fetch('http://localhost:3001/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openAtLogin: newValue })
      });
    } catch (err) {
      console.error(err);
      setOpenAtLogin(!newValue); // revert on failure
    }
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
        
        <div>
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
        </div>
        
      </div>
    </div>
  );
}
