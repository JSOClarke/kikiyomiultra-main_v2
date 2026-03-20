import React from 'react';
import { Book } from '../../types';
import { useStatsStore } from '../../store/useStatsStore';
import { BookOpen, Clock, Activity } from 'lucide-react';

interface BookStatCardProps {
  book: Book;
  onClick: () => void;
}

export const BookStatCard: React.FC<BookStatCardProps> = ({ book, onClick }) => {
  // Extract aggregator and subscribe to dailyRecords to safely trigger reactive re-renders
  const getAggregateStatsForBook = useStatsStore(state => state.getAggregateStatsForBook);
  useStatsStore(state => state.dailyRecords); // Safe dependency mapping
  
  const stats = getAggregateStatsForBook(book.id);
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  return (
    <div 
      onClick={onClick}
      className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col gap-4 cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1 group"
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="w-16 h-24 rounded overflow-hidden bg-bg shrink-0 shadow-inner flex items-center justify-center border border-white/10">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <BookOpen size={24} className="text-text-muted opacity-50" />
          )}
        </div>
        
        {/* Title Meta */}
        <div className="flex-1 flex flex-col justify-start overflow-hidden">
          <span className="text-[0.65rem] font-bold tracking-widest text-primary uppercase mb-1">{book.type}</span>
          <h3 className="font-bold text-text text-sm line-clamp-2 group-hover:text-primary transition-colors">{book.title}</h3>
          <p className="text-xs text-text-muted mt-1 truncate">{book.author}</p>
        </div>
      </div>

      {/* Aggregate Widgets */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="bg-bg border border-border rounded p-2 flex flex-col items-center justify-center border-l-2 border-l-sec">
          <Clock size={14} className="text-sec mb-1" />
          <span className="text-xs font-mono font-bold text-text tracking-wider">{formatTime(stats.timeReadSeconds)}</span>
        </div>
        <div className="bg-bg border border-border rounded p-2 flex flex-col items-center justify-center border-l-2 border-l-primary">
          <Activity size={14} className="text-primary mb-1" />
          <span className="text-xs font-mono font-bold text-text tracking-wider">{stats.wordsRead.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
