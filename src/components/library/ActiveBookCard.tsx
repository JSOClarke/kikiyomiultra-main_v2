import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, BookOpen } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';

export const ActiveBookCard: React.FC = () => {
  const navigate = useNavigate();
  const activeBookFromStore = usePlayerStore(state => state.activeBook);
  const firstLibraryBook = usePlayerStore(state => {
    if (!state.library || state.library.length === 0) return null;
    return state.library.find(b => b.savedIndex && b.savedIndex > 0) || state.library[0];
  });
  const activeBook = activeBookFromStore || firstLibraryBook;
  const activeIndex = usePlayerStore(state => state.activeIndex);

  if (!activeBook) return null;

  // Calculate percentage based on subtitle index
  let percent = 0;
  const total = activeBook.totalSubtitles || (activeBook.subtitles ? activeBook.subtitles.length : 0);
  if (total > 0) {
    const currentIndex = activeBook.id === usePlayerStore.getState().activeBook?.id ? activeIndex : (activeBook.savedIndex || 0);
    percent = Math.floor((currentIndex / total) * 100);
  }

  return (
    <div 
      onClick={() => navigate(`/player/${activeBook.id}`)}
      className="w-full bg-surface border border-white/5 shadow-md rounded-2xl p-5 flex flex-col md:flex-row gap-6 items-center cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30 group"
    >
      {/* Cover / Icon */}
      <div className="w-24 h-32 md:w-32 md:h-40 bg-bg rounded-xl flex items-center justify-center border border-white/5 shrink-0 shadow-inner overflow-hidden">
        {activeBook.coverUrl ? (
          <img src={activeBook.coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <BookOpen size={40} className="text-primary opacity-80 group-hover:scale-110 transition-transform duration-300" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col justify-center w-full">
        <div className="text-xs font-bold text-primary uppercase tracking-widest mb-1.5 opacity-80">Currently Reading</div>
        <h3 className="text-xl md:text-2xl font-bold text-text mb-2 line-clamp-2">{activeBook.title || 'Unknown Title'}</h3>
        <p className="text-sm text-text-muted mb-4 line-clamp-2">{activeBook.author || 'Unknown Author'}</p>
        
        {/* Progress */}
        <div className="w-full mb-2 flex items-center gap-3">
          <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)] transition-all duration-500" 
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-xs font-mono text-text-muted font-bold">{percent}%</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="hidden md:flex shrink-0 px-4">
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-bg shadow-lg shadow-primary/20 group-hover:scale-105 transition-all">
          <Play size={24} fill="currentColor" className="ml-1" />
        </div>
      </div>
    </div>
  );
}
