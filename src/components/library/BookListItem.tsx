import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, BookOpen, Trash2 } from 'lucide-react';
import { Book } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { apiClient } from '../../apiClient';

interface BookListItemProps {
  book: Book;
  percent?: number;
}

export const BookListItem: React.FC<BookListItemProps> = ({ book, percent }) => {
  const navigate = useNavigate();
  const setActiveBook = usePlayerStore((state) => state.setActiveBook);
  
  // If a percentage wasn't strictly provided, we try calculating it ourselves 
  let displayPercent = percent || 0;
  const total = book.totalSubtitles || (book.subtitles ? book.subtitles.length : 0);
  if (!percent && total > 0) {
     const currentIndex = book.id === usePlayerStore.getState().activeBook?.id ? usePlayerStore.getState().activeIndex : (book.savedIndex || 0);
     displayPercent = Math.floor((currentIndex / total) * 100);
  }

  const handleOpenBook = async () => {
    try {
      // 1. Fetch full 5MB subtitle payload from backend instead of just the library manifest
      const fullBook = await apiClient.getBook(book.id);
      setActiveBook(fullBook);
      navigate(`/player/${book.id}`);
    } catch (e) {
      console.warn("Failed to fetch full book payload from API", e);
      setActiveBook(book); // Fallback to manifest data
      navigate(`/player/${book.id}`);
    }
  };

  return (
    <div 
      onClick={handleOpenBook}
      className="bg-surface border border-white/5 shadow-sm rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:shadow-md hover:border-white/10 group active:scale-[0.98] min-h-[14rem]"
    >
      <div className="h-32 bg-bg flex items-center justify-center border-b border-black/5 dark:border-white/5 relative overflow-hidden shrink-0 shadow-inner">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : book.type === 'epub' ? (
          <BookOpen size={40} className="text-text-muted opacity-80 group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <Headphones size={40} className="text-text-muted opacity-80 group-hover:scale-110 transition-transform duration-500" />
        )}
        <div className="absolute top-3 right-3 text-[0.65rem] font-bold px-2 py-1 rounded bg-surface/80 backdrop-blur-md text-text border border-white/5 shadow-sm transition-all duration-300 group-hover:opacity-0">
          {book.type === 'epub' ? 'EPUB' : 'AUDIO'}
        </div>
        
        {/* Delete Button (Appears on Hover) */}
        <button 
          onClick={(e) => {
             e.stopPropagation();
             if (window.confirm(`Are you sure you want to completely delete "${book.title}" from your offline library?`)) {
                usePlayerStore.getState().deleteBook(book.id);
             }
          }}
          title="Delete Book"
          className="absolute top-3 right-3 bg-warn/90 hover:bg-warn text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg z-10"
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <h4 className="text-[0.9rem] leading-snug font-bold text-text line-clamp-2 mb-3 group-hover:text-primary transition-colors">{book.title}</h4>
        
        <div className="mt-auto">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[0.65rem] text-text-muted uppercase tracking-widest font-bold">Progress</span>
            <span className="text-xs text-text font-mono font-bold">{displayPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden border border-white/5">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${displayPercent === 100 ? 'bg-sec shadow-[0_0_8px_var(--sec)]' : 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]'}`} 
              style={{ width: `${displayPercent}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
