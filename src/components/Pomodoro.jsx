import { useState, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';

export default function Pomodoro() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      new Notification("Pomodoro Finished!", { body: "Time to take a well-deserved break!" });
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="glass-panel p-4 mt-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
        <Timer size={18} /> Focus Timer
      </h3>
      <div className="flex flex-col items-center gap-3">
        <div className="text-4xl font-bold font-mono tracking-wider">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="flex gap-2">
          <button className="btn-icon bg-primary/20 hover:bg-primary/40 text-primary p-2 rounded-full" onClick={toggleTimer}>
            {isActive ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button className="btn-icon bg-gray-500/20 hover:bg-gray-500/40 p-2 rounded-full" onClick={resetTimer}>
            <RotateCcw size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
