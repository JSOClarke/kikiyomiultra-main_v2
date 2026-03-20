import React from 'react';
import { usePlayerStore } from '../../store/usePlayerStore';

export const ChapterSidebar: React.FC = () => {
  const activeBook = usePlayerStore(state => state.activeBook);
  const activeIndex = usePlayerStore(state => state.activeIndex);
  const currentTime = usePlayerStore(state => state.currentTime);
  const setActiveIndex = usePlayerStore(state => state.setActiveIndex);
  const seekTo = usePlayerStore(state => state.seekTo);

  const chapters = activeBook?.chapters || [];

  const handleChapterClick = (chap: any) => {
    if (activeBook?.type === 'epub' && chap.subtitleIndex !== undefined) {
      setActiveIndex(chap.subtitleIndex);
    } else if (activeBook?.type === 'audiobook' && chap.startTime !== undefined) {
      seekTo(chap.startTime);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="absolute top-0 bottom-0 right-0 w-[320px] bg-surface border-l border-border overflow-y-auto z-[60] shadow-[-5px_0_15px_rgba(0,0,0,0.5)] pb-[150px]">
      {chapters.length === 0 && (
        <div className="p-4 text-center text-text-muted text-sm">
          No chapters found
        </div>
      )}
      {chapters.map((chap, idx) => {
        let isActive = false;
        if (activeBook?.type === 'epub') {
            const nextChap = chapters[idx + 1];
            if (nextChap && nextChap.subtitleIndex !== undefined) {
                isActive = activeIndex >= (chap.subtitleIndex || 0) && activeIndex < nextChap.subtitleIndex;
            } else {
                isActive = activeIndex >= (chap.subtitleIndex || 0);
            }
        } else if (activeBook?.type === 'audiobook') {
            const nextChap = chapters[idx + 1];
            if (nextChap && nextChap.startTime !== undefined) {
                isActive = currentTime >= (chap.startTime || 0) && currentTime < nextChap.startTime;
            } else {
                isActive = currentTime >= (chap.startTime || 0);
            }
        }

        return (
          <div
            key={chap.id || idx}
            onClick={() => handleChapterClick(chap)}
            className={`px-3 py-1.5 border-b border-border text-[0.85rem] cursor-pointer flex items-center transition-colors duration-200
              ${isActive 
                ? 'bg-primary text-bg font-bold' 
                : 'text-text-muted bg-transparent hover:bg-surface-hover hover:text-text'}`}
          >
            <span
              className={`text-[0.75rem] mr-2.5 font-mono min-w-[45px] text-right
                ${isActive ? 'text-bg' : 'text-text-muted'}`}
            >
              {activeBook?.type === 'epub' ? (chap.subtitleIndex || 0) : formatTime(chap.startTime || 0)}
            </span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap" title={chap.title}>
              {chap.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}
