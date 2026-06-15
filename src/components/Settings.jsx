import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Power } from 'lucide-react';

export default function Settings() {
  const [openAtLogin, setOpenAtLogin] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/settings')
      .then(res => res.json())
      .then(data => setOpenAtLogin(data.openAtLogin))
      .catch(console.error);
  }, []);

  const toggleBoot = async () => {
    const newValue = !openAtLogin;
    setOpenAtLogin(newValue);
    try {
      await fetch('http://localhost:3001/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openAtLogin: newValue })
      });
    } catch (e) {
      console.error(e);
      setOpenAtLogin(!newValue); // revert on failure
    }
  };

  return (
    <div className="glass-panel p-4 mt-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
        <SettingsIcon size={18} /> Settings
      </h3>
      <div className="flex items-center justify-between">
        <span className="text-sm">Launch OmniTask on Boot</span>
        <button 
          onClick={toggleBoot}
          className={`flex items-center justify-center p-2 rounded-full transition-colors ${openAtLogin ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'}`}
          title={openAtLogin ? "Enabled" : "Disabled"}
        >
          <Power size={18} />
        </button>
      </div>
    </div>
  );
}
