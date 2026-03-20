import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const PomodoroTimer: React.FC = () => {
  const { 
    pomodoroTimeLeft, pomodoroMode, isPomodoroActive, 
    pomodoroFocusDuration, pomodoroBreakDuration, setPomodoroState,
    isSidebarCollapsed
  } = useStore();

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
    } catch(e) {}
  };

  // Recover lost time on mount/reload or if backgrounded
  useEffect(() => {
    const state = useStore.getState();
    if (state.isPomodoroActive) {
      const now = Date.now();
      const lastTick = state.pomodoroLastTick || now;
      const elapsedSeconds = Math.floor((now - lastTick) / 1000);
      
      if (elapsedSeconds > 0) {
        let newTimeLeft = state.pomodoroTimeLeft - elapsedSeconds;
        
        if (newTimeLeft <= 0) {
          playBeep();
          if (state.pomodoroMode === 'focus') {
            setPomodoroState({ 
              pomodoroMode: 'break', 
              pomodoroTimeLeft: state.pomodoroBreakDuration * 60,
              isPomodoroActive: false,
              pomodoroLastTick: Date.now()
            });
          } else {
            setPomodoroState({ 
              pomodoroMode: 'focus', 
              pomodoroTimeLeft: state.pomodoroFocusDuration * 60,
              isPomodoroActive: false,
              pomodoroLastTick: Date.now()
            });
          }
        } else {
          setPomodoroState({ 
            pomodoroTimeLeft: newTimeLeft,
            pomodoroLastTick: now
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPomodoroActive && pomodoroTimeLeft > 0) {
      interval = setInterval(() => {
        setPomodoroState({ 
          pomodoroTimeLeft: pomodoroTimeLeft - 1,
          pomodoroLastTick: Date.now()
        });
      }, 1000);
    } else if (isPomodoroActive && pomodoroTimeLeft === 0) {
      playBeep();
      if (pomodoroMode === 'focus') {
        setPomodoroState({ 
          pomodoroMode: 'break', 
          pomodoroTimeLeft: pomodoroBreakDuration * 60,
          isPomodoroActive: false
        });
      } else {
        setPomodoroState({ 
          pomodoroMode: 'focus', 
          pomodoroTimeLeft: pomodoroFocusDuration * 60,
          isPomodoroActive: false,
          pomodoroLastTick: Date.now()
        });
      }
    }
    return () => clearInterval(interval);
  }, [isPomodoroActive, pomodoroTimeLeft, pomodoroMode, pomodoroFocusDuration, pomodoroBreakDuration, setPomodoroState]);

  const toggleTimer = () => setPomodoroState({ isPomodoroActive: !isPomodoroActive, pomodoroLastTick: Date.now() });
  
  const resetTimer = () => {
    setPomodoroState({ 
      isPomodoroActive: false, 
      pomodoroTimeLeft: pomodoroMode === 'focus' ? pomodoroFocusDuration * 60 : pomodoroBreakDuration * 60,
      pomodoroLastTick: Date.now()
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = pomodoroMode === 'focus' 
    ? 1 - (pomodoroTimeLeft / (pomodoroFocusDuration * 60))
    : 1 - (pomodoroTimeLeft / (pomodoroBreakDuration * 60));

  if (isSidebarCollapsed) {
    return (
      <div 
        onClick={toggleTimer}
        title={isPomodoroActive ? "Pause Timer" : "Start Timer"}
        className="mx-3 mb-6 flex flex-col items-center justify-center cursor-pointer relative group"
      >
        <div className={`relative w-10 h-10 flex items-center justify-center bg-surface border rounded-full transition-colors duration-500
          ${isPomodoroActive 
            ? (pomodoroMode === 'focus' ? 'border-primary' : 'border-green-500') 
            : 'border-black/5 dark:border-white/5 shadow-sm hover:border-black/10 dark:hover:border-white/10 hover:shadow'
          }`}
        >
            {/* Ambient Glow */}
            {isPomodoroActive && (
              <div className={`absolute -inset-1 rounded-full blur-md opacity-30 pointer-events-none transition-colors duration-500 ${pomodoroMode === 'focus' ? 'bg-primary' : 'bg-green-500'}`} />
            )}
            
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="20" cy="20" r="18" className="stroke-border fill-none opacity-50" strokeWidth="2" />
              <circle 
                cx="20" cy="20" r="18" 
                className={`fill-none transition-all duration-1000 ease-linear ${pomodoroMode === 'focus' ? 'stroke-primary' : 'stroke-green-500'}`} 
                strokeWidth="2" 
                strokeDasharray={`${progress * 113} 113`} 
                strokeLinecap="round" 
              />
            </svg>
            <div className={`text-[0.6rem] font-bold ${pomodoroMode === 'focus' ? 'text-primary' : 'text-green-500'} font-mono relative z-10`}>
              {Math.ceil(pomodoroTimeLeft / 60)}
            </div>
            
            {/* Status Indicator Badge */}
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface flex items-center justify-center z-20 transition-colors
              ${isPomodoroActive 
                  ? (pomodoroMode === 'focus' ? 'bg-primary text-bg' : 'bg-green-500 text-bg') 
                  : 'bg-surface-hover text-text-muted'
              }
            `}>
              {isPomodoroActive ? (
                <Play size={8} className="translate-x-[0.5px] fill-current" />
              ) : (
                <Pause size={8} className="fill-current" />
              )}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-6 p-4 rounded-xl border border-black/5 dark:border-white/5 bg-surface relative overflow-hidden group shadow-sm flex flex-col gap-3">
      {/* Background progress bar */}
      <div className="absolute top-0 left-0 bottom-0 bg-black/5 dark:bg-white/5 transition-all duration-1000 ease-linear z-0" style={{ width: `${progress * 100}%` }}></div>
      
      <div className="relative z-10 flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          {pomodoroMode === 'focus' ? <Brain size={14} className="text-primary" /> : <Coffee size={14} className="text-green-500" />}
          <span className="text-xs uppercase tracking-widest font-bold text-text-muted">
            {pomodoroMode}
          </span>
        </div>
        <div className="text-xl font-mono font-bold text-text tracking-tight">
          {formatTime(pomodoroTimeLeft)}
        </div>
      </div>

      <div className="relative z-10 flex gap-2">
        <button 
          onClick={toggleTimer}
          className={`flex-1 h-8 rounded-lg flex items-center justify-center gap-1 text-xs font-bold transition-all ${isPomodoroActive ? 'bg-black/10 dark:bg-white/10 text-text hover:bg-black/20 dark:hover:bg-white/20' : 'bg-primary text-bg hover:bg-primary/90 shadow-[0_2px_8px_rgba(var(--color-primary),0.3)]'}`}
        >
          {isPomodoroActive ? <Pause size={14} /> : <Play size={14} />} 
          {isPomodoroActive ? 'Pause' : 'Start'}
        </button>
        <button 
          onClick={resetTimer}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-hover text-text-muted hover:text-text transition-colors"
          title="Reset"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};
