import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize, MessageSquare } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useStore } from '../../store/useStore';

export const AudioControls: React.FC = () => {
  const {
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    seekTo,
    audioRef,
    activeBook
  } = usePlayerStore();

  const toggleFocusMode = useStore((state) => state.toggleFocusMode);
  const showAnnotations = useStore((state) => state.showAnnotations);
  const toggleAnnotations = useStore((state) => state.toggleAnnotations);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    seekTo(newTime);
  };

  const handleSkip = (amount: number) => {
    const newTime = Math.max(0, Math.min(currentTime + amount, duration));
    seekTo(newTime);
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef) {
      audioRef.volume = parseFloat(e.target.value) / 100;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full h-[140px] bg-surface/95 backdrop-blur-xl p-4 px-5 flex flex-col justify-center gap-4 border-t border-border shadow-[0_-10px_30px_rgba(0,0,0,0.2)] z-40 transition-all">
      <div className="flex items-center gap-4 text-text-muted font-mono text-sm max-w-3xl mx-auto w-full">
        <span>{formatTime(currentTime)}</span>
        
        <div className="flex-1 relative h-4 flex items-center group">
          <div className="absolute left-0 w-full h-1.5 bg-border rounded-full z-10 transition-all group-hover:h-2" />
          <div 
            className="absolute left-0 h-1.5 bg-primary rounded-full z-20 pointer-events-none transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(var(--primary),0.4)] group-hover:h-2" 
            style={{ width: `${percent}%` }}
          />
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={percent} 
            onChange={handleSeek}
            className="w-full cursor-pointer h-4 bg-transparent appearance-none relative z-30 m-0" 
          />
        </div>
        
        <span>{formatTime(duration)}</span>
      </div>

      <div className="relative flex justify-center items-center w-full max-w-3xl mx-auto">
        
        {/* Left Side: Secondary tools (Focus Mode) */}
        <div className="hidden md:flex items-center gap-3 w-[150px] absolute left-0">
          <button 
            onClick={toggleFocusMode}
            className="flex items-center gap-2 text-sm font-medium text-text-muted opacity-70 hover:opacity-100 hover:text-primary transition-all bg-transparent border-none cursor-pointer"
            title="Toggle Focus Mode"
          >
            <Maximize size={18} />
            Focus
          </button>
          <button 
            onClick={toggleAnnotations}
            className={`flex items-center gap-2 text-sm font-medium transition-all bg-transparent border-none cursor-pointer ${showAnnotations ? 'text-primary opacity-100' : 'text-text-muted opacity-70 hover:opacity-100 hover:text-primary'}`}
            title="Toggle Annotations"
          >
            <MessageSquare size={18} />
            Notes
          </button>
        </div>

        {/* Center: Main Controls */}
        <div className="flex justify-center gap-6 items-center">
          <ControlButton icon={<SkipBack size={20} />} onClick={() => handleSkip(-5)} />
          <ControlButton 
            icon={isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />} 
            main 
            onClick={togglePlay}
          />
          <ControlButton icon={<SkipForward size={20} />} onClick={() => handleSkip(5)} />
        </div>
        
        {/* Right Side: Volume */}
        <div className="hidden md:flex items-center gap-2.5 w-[150px] absolute right-0 text-text-muted opacity-60 hover:opacity-100 transition-opacity">
          <Volume2 size={20} />
          <input 
            type="range" 
            min="0" 
            max="100" 
            defaultValue="100" 
            onChange={handleVolumeChange}
            className="flex-1 h-1.5 bg-border rounded-full outline-none appearance-none cursor-pointer hover:bg-white/20 transition-colors" 
          />
        </div>
      </div>

      {/* Absolute Pinned Cover Art Thumbnail */}
      {activeBook && (activeBook.coverUrl || activeBook.coverBlob) ? (
        <div className="hidden md:block absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-[50px] h-[70px] rounded shadow-sm overflow-hidden flex-shrink-0 bg-surface-hover/50 border border-white/10 z-50">
          <img 
            src={activeBook.coverUrl || (activeBook.coverBlob ? URL.createObjectURL(activeBook.coverBlob) : '')} 
            alt="Audiobook cover" 
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
    </div>
  );
};

interface ControlButtonProps {
  icon: React.ReactNode;
  main?: boolean;
  onClick: () => void;
}

const ControlButton: React.FC<ControlButtonProps> = ({ icon, main = false, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`border border-transparent rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95
        ${main 
          ? 'w-16 h-16 bg-primary text-bg shadow-lg shadow-primary/30 hover:scale-105 hover:shadow-primary/50' 
          : 'w-12 h-12 bg-surface hover:bg-surface-hover text-text hover:shadow-sm border-black/5 dark:border-white/5'
        }`}
    >
      {icon}
    </button>
  );
}
