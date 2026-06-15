import { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const [openAtLogin, setOpenAtLogin] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/settings')
      .then(res => res.json())
      .then(data => setOpenAtLogin(!!data.openAtLogin))
      .catch(console.error);
  }, []);

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
    <div className="glass-panel p-4 mt-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
        <SettingsIcon size={18} /> Settings
      </h3>
      <div className="flex items-center justify-between">
        <span className="text-sm">Start on Boot</span>
        
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={openAtLogin} 
            onChange={toggleBoot} 
          />
          <span className="toggle-slider"></span>
        </label>

      </div>
    </div>
  );
}
