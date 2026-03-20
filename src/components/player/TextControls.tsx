import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useStore } from '../../store/useStore';
import { Settings, List, ChevronLeft, ChevronRight, BookOpen, Scissors, MessageSquare } from 'lucide-react';

export const TextControls: React.FC = () => {
  const activeBook = usePlayerStore((state) => state.activeBook);
  const activeIndex = usePlayerStore((state) => state.activeIndex);
  const skipToNextSubtitle = usePlayerStore((state) => state.skipToNextSubtitle);
  const skipToPreviousSubtitle = usePlayerStore((state) => state.skipToPreviousSubtitle);
  const setActiveIndex = usePlayerStore((state) => state.setActiveIndex);
  const toggleCommaSplit = usePlayerStore((state) => state.toggleCommaSplit);
  const showAnnotations = useStore((state) => state.showAnnotations);
  const toggleAnnotations = useStore((state) => state.toggleAnnotations);

  // Fallback if no book or no subtitles
  if (!activeBook || !activeBook.subtitles || activeBook.subtitles.length === 0) return null;

  const totalLines = activeBook.subtitles.length;
  // +1 because index is 0-based, but UI is 1-based
  const currentLine = activeIndex + 1;
  const progressPercent = (currentLine / totalLines) * 100;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const newIndex = Math.min(Math.floor(percent * totalLines), totalLines - 1);
    setActiveIndex(Math.max(0, newIndex));
  };

  return (
    <div className="fixed bottom-0 left-0 w-full bg-surface/95 backdrop-blur-xl border-t border-border p-4 md:px-8 flex flex-col items-center gap-3 z-40 transition-all shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
      
      {/* ProgressBar (Paginated) */}
      <div className="w-full max-w-4xl flex items-center gap-4 text-xs font-mono text-text-muted hover:text-text transition-colors group">
        <span className="w-12 text-right">{currentLine}</span>
        
        <div 
          className="flex-1 h-3 bg-bg rounded-full relative overflow-hidden cursor-pointer border border-white/5 transition-all hover:h-4 group-hover:h-4"
          onClick={handleProgressClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <span className="w-12">{totalLines}</span>
      </div>

      {/* Main Controls */}
      <div className="w-full max-w-4xl flex justify-between items-center px-2">
        
        {/* Left Actions */}
        <div className="flex items-center gap-4">
          <button 
            className="p-2 text-text-muted hover:text-text hover:bg-white/10 rounded-full transition-all"
            title="Chapters / Index"
          >
            <List size={20} />
          </button>
          
          <div className="hidden md:flex flex-col ml-2">
            <span className="text-sm font-medium text-text truncate max-w-[200px]">
              {activeBook.title}
            </span>
            <span className="text-xs text-text-muted flex items-center gap-1">
              <BookOpen size={10} /> Text Mode
            </span>
          </div>
        </div>

        {/* Center Playback - Pagination */}
        <div className="flex items-center gap-6">
          <button 
            onClick={skipToPreviousSubtitle}
            disabled={activeIndex === 0}
            className="p-2 text-text hover:text-primary hover:bg-primary/10 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft size={28} />
          </button>
          
          <button 
            onClick={skipToNextSubtitle}
            disabled={activeIndex === totalLines - 1}
            className="p-3 bg-primary text-bg rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(var(--primary),0.4)] disabled:opacity-50 disabled:hover:scale-100"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight size={32} />
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={toggleCommaSplit}
            className={`p-2 flex items-center gap-1.5 md:hidden text-xs rounded-full transition-all ${activeBook.splitByCommas ? 'bg-primary/20 text-primary border border-primary/30' : 'text-text-muted hover:text-text hover:bg-white/10'}`}
            title="Toggle Sentence Splitting"
          >
            <Scissors size={18} />
          </button>
          
          <button 
            onClick={toggleCommaSplit}
            className={`hidden md:flex p-2 items-center gap-1.5 text-xs rounded-full transition-all ${activeBook.splitByCommas ? 'bg-primary/20 text-primary border border-primary/30 px-3' : 'text-text-muted hover:text-text hover:bg-white/10 px-2'}`}
            title="Toggle Sentence Splitting"
          >
            <Scissors size={18} /> {activeBook.splitByCommas ? 'Split' : ''}
          </button>
          
          <button 
            onClick={toggleAnnotations}
            className={`p-2 flex items-center gap-1.5 md:hidden text-xs rounded-full transition-all ${showAnnotations ? 'bg-primary/20 text-primary border border-primary/30' : 'text-text-muted hover:text-text hover:bg-white/10'}`}
            title="Toggle Annotations"
          >
            <MessageSquare size={18} />
          </button>
          
          <button 
            onClick={toggleAnnotations}
            className={`hidden md:flex p-2 items-center gap-1.5 text-xs rounded-full transition-all ${showAnnotations ? 'bg-primary/20 text-primary border border-primary/30 px-3' : 'text-text-muted hover:text-text hover:bg-white/10 px-2'}`}
            title="Toggle Annotations"
          >
            <MessageSquare size={18} /> {showAnnotations ? 'Notes' : ''}
          </button>
          
          <button 
            className="p-2 text-text-muted hover:text-text hover:bg-white/10 rounded-full transition-all flex-shrink-0"
            title="Reader Settings"
          >
            <Settings size={20} />
          </button>
        </div>

      </div>

      {/* Absolute Pinned Cover Art Thumbnail */}
      {(activeBook.coverUrl || activeBook.coverBlob) && (
        <div className="hidden md:block absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-[50px] h-[70px] rounded shadow-sm overflow-hidden flex-shrink-0 bg-surface-hover/50 border border-white/10 z-50">
          <img 
            src={activeBook.coverUrl || (activeBook.coverBlob ? URL.createObjectURL(activeBook.coverBlob) : '')} 
            alt="Book cover" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
};
