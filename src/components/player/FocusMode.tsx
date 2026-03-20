import React, { useEffect, useState } from 'react';
import { Star, LibraryBig, Check } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAnki } from '../../hooks/useAnki';
import { Subtitle } from '../../types';

export const FocusMode: React.FC = () => {
  const toggleFocusMode = useStore((state) => state.toggleFocusMode);
  
  const subtitles = usePlayerStore((state) => state.activeBook?.subtitles || []);
  const activeIndex = usePlayerStore((state) => state.activeIndex);
  
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  
  // Token Navigation state
  const isTokenNavMode = usePlayerStore((state) => state.isTokenNavMode);
  const navTokens = usePlayerStore((state) => state.navTokens);
  const activeTokenIndex = usePlayerStore((state) => state.activeTokenIndex);
  const setActiveTokenIndex = usePlayerStore((state) => state.setActiveTokenIndex);
  
  const { enhanceCard, isEnhancing } = useAnki();
  const [activeSub, setActiveSub] = useState<Subtitle | null>(null);
  const [ankiStatus, setAnkiStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Bookmark Global Logic Hook
  const bookmarks = useStore((state) => state.bookmarks);
  const addBookmark = useStore((state) => state.addBookmark);
  const removeBookmark = useStore((state) => state.removeBookmark);
  
  const activeBookId = usePlayerStore((state) => state.activeBook?.id);
  const activeBookmark = activeSub ? bookmarks.find(b => b.subtitleId === activeSub.id && b.bookId === activeBookId) : null;
  const isBookmarked = !!activeBookmark;

  const handleAnkiMining = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (activeSub) {
      try {
        setAnkiStatus('idle');
        await enhanceCard(activeIndex, activeSub.text);
        setAnkiStatus('success');
        setTimeout(() => setAnkiStatus('idle'), 2000);
      } catch (err) {
        console.warn("Anki enhancement failed in focus mode", err);
        setAnkiStatus('error');
        setTimeout(() => setAnkiStatus('idle'), 3000);
      }
    }
  };

  // Sync active subtitle purely from the unified global activeIndex
  useEffect(() => {
    if (subtitles.length > 0 && activeIndex >= 0 && activeIndex < subtitles.length) {
      setActiveSub(subtitles[activeIndex]);
    } else {
      setActiveSub(null);
    }
  }, [activeIndex, subtitles]);

  // Handle Escape Key to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleFocusMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFocusMode]);

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="fixed inset-0 bg-bg/95 backdrop-blur-xl z-[100] flex flex-col justify-center items-center p-10 animate-in fade-in duration-300"
      onClick={togglePlay} // Clicking anywhere toggles play/pause for a zen experience
    >
      <div 
        className={`text-center font-reader font-medium text-text leading-tight w-full max-w-7xl drop-shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all ${isTokenNavMode ? 'select-none' : 'select-text'}`}
        style={{ fontSize: 'calc(var(--font-size-base) * 1.5)' }}
        onClick={(e: React.MouseEvent) => {
          if (!isTokenNavMode) e.stopPropagation(); // Only allow standard text selection preventing if not in nav mode
        }}
      >
        {activeSub ? (
          isTokenNavMode ? (
            navTokens.map((token) => (
              <span
                key={token.index}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTokenIndex(token.index);
                }}
                className={`rounded-[6px] transition-all duration-200 ${
                  token.isWordLike ? 'cursor-pointer hover:bg-white/10' : ''
                } ${!token.isWordLike && token.text.trim() === '' ? 'pointer-events-none' : ''} ${
                  activeTokenIndex === token.index && token.isWordLike
                    ? 'bg-primary text-bg shadow-lg'
                    : ''
                }`}
              >
                {token.text}
              </span>
            ))
          ) : (
            activeSub.text
          )
        ) : (
          "..."
        )}
      </div>
      
      <div className={`mt-8 text-xl md:text-2xl text-primary/80 font-sans tracking-wide transition-all duration-700 ${activeSub?.translation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {activeSub?.translation}
      </div>

      <div className="absolute bottom-10 text-text-muted text-sm font-sans opacity-0 transition-opacity duration-1000 animate-in fade-in delay-1000 fill-mode-forwards">
        Press Esc to exit Focus Mode
      </div>

      <div className="fixed bottom-10 right-10 flex gap-4 z-[110]">
        <button
          onClick={handleAnkiMining}
          disabled={activeSub ? isEnhancing[activeSub.id] : false}
          className={`w-[54px] h-[54px] rounded-full flex items-center justify-center cursor-pointer backdrop-blur-md transition-all duration-200
            ${activeSub && isEnhancing[activeSub.id] ? 'animate-pulse border-yellow-400 border-2 text-yellow-500 scale-110 bg-white/10' : 
              ankiStatus === 'success' ? 'border-green-500 border-2 text-green-500 scale-110 bg-white/10' :
              ankiStatus === 'error' ? 'border-red-500 border-2 text-red-500 scale-110 bg-white/10' :
              activeSub?.isMined ? 'border-green-500 border-2 text-green-500 scale-110 bg-white/10 opacity-100 hover:border-green-400' :
              'bg-white/5 border border-white/10 text-text-muted opacity-50 hover:bg-white/10 hover:text-text hover:scale-110 hover:border-sec hover:opacity-100'}`}
          title={activeSub?.isMined ? "Sent to Anki" : "Send to Anki"}
        >
          {ankiStatus === 'success' || activeSub?.isMined ? <Check size={24} /> : <LibraryBig size={24} />}
        </button>

        <button
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            if (!activeSub || !activeBookId) return;
            if (isBookmarked && activeBookmark) {
              removeBookmark(activeBookmark.id);
            } else {
              addBookmark({
                id: crypto.randomUUID(),
                bookId: activeBookId,
                subtitleId: activeSub.id,
                text: activeSub.text,
                timestamp: Date.now()
              });
            }
          }}
          className={`w-[54px] h-[54px] rounded-full flex items-center justify-center cursor-pointer backdrop-blur-md transition-all duration-200
            ${isBookmarked ? 'bg-primary/20 text-primary border border-primary scale-110' : 'bg-white/5 border border-white/10 text-text-muted opacity-50 hover:bg-white/10 hover:text-text hover:scale-110 hover:border-primary hover:opacity-100'}`}
          title={isBookmarked ? "Remove Bookmark" : "Bookmark"}
        >
          <Star size={24} fill={isBookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Progress Bar mapped to top of screen in focus mode */}
      <div className="fixed top-0 left-0 w-full h-1 bg-white/5 z-[120]">
        <div 
          className="h-full bg-primary opacity-50 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(var(--primary),0.8)]" 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
