import React from 'react';
import { useStatsStore } from '../../store/useStatsStore';
import { useStore } from '../../store/useStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { ChevronLeft, Clock, BookOpen, Layers, Type, Activity } from 'lucide-react';

interface BookDetailViewProps {
  bookId: string;
  onBack: () => void;
}

export const BookDetailView: React.FC<BookDetailViewProps> = ({ bookId, onBack }) => {
  const book = usePlayerStore(state => state.library.find(b => b.id === bookId));
  
  const getAggregateStatsForBook = useStatsStore(state => state.getAggregateStatsForBook);
  useStatsStore(state => state.dailyRecords); // Subscribe to reactive changes
  const stats = getAggregateStatsForBook(bookId);
  
  // Mining History specifically filtered to this unique Book
  // Fallback to bookTitle for legacy records that didn't have bookId saved yet
  const fullMiningHistory = useStore(state => state.miningHistory);
  const miningHistory = fullMiningHistory.filter(m => m.bookId === bookId || m.bookTitle === book?.title);
  
  if (!book) return <div className="text-center p-12 text-text-muted">Book data unavailable.</div>;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  const readingSpeed = stats.timeReadSeconds > 0 ? Math.round(stats.wordsRead / (stats.timeReadSeconds / 60)) : 0;

  return (
    <div className="w-full flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-500">
      
      {/* Header Block */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-text-muted hover:text-text transition-colors w-fit mb-6 opacity-80 hover:opacity-100"
      >
        <ChevronLeft size={20} /> Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row gap-6 mb-8 p-6 bg-surface border border-white/5 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        
        <div className="w-24 h-36 md:w-32 md:h-48 bg-bg rounded-lg shadow-inner overflow-hidden shrink-0 border border-white/10 z-10">
          {book.coverUrl ? (
            <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><BookOpen size={40} className="text-primary/30" /></div>
          )}
        </div>
        
        <div className="flex flex-col justify-center z-10">
           <span className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-80">{book.type}</span>
           <h1 className="text-2xl md:text-3xl font-bold text-text tracking-tight mb-2 leading-tight">{book.title}</h1>
           <p className="text-text-muted">{book.author}</p>
        </div>
      </div>

      {/* Aggregate Widgets */}
      <h2 className="text-lg font-bold text-text mb-4">Lifetime Analytics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard value={stats.wordsRead.toLocaleString()} label="Words Read" icon={<Type size={16} />} />
        <StatCard value={stats.charactersRead.toLocaleString()} label="Characters" icon={<Layers size={16} />} />
        <StatCard value={formatTime(stats.timeReadSeconds)} label="Time Read" icon={<Clock size={16} />} color="text-sec" />
        <StatCard value={readingSpeed.toString()} unit="wpm" label="Average Speed" icon={<Activity size={16} />} />
      </div>

      <h2 className="text-lg font-bold text-text mb-4 border-b border-border pb-3 flex items-center gap-2">
        Anki Mining History 
        <span className="text-xs bg-surface-hover text-text-muted px-2 py-1 rounded-md">{miningHistory.length} Cards</span>
      </h2>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-24">
        {miningHistory.length === 0 ? (
          <div className="text-center py-16 text-sm text-text-muted border border-dashed border-white/10 rounded-2xl bg-surface/30">
            You haven't extracted any Anki cards from this source material yet.
          </div>
        ) : (
          miningHistory.map(entry => (
            <div key={entry.id} className="p-4 bg-surface border border-white/5 shadow-sm rounded-xl hover:border-sec/40 transition-colors group flex items-start gap-4">
               <div className="w-8 h-8 rounded-lg bg-sec/10 text-sec flex items-center justify-center shrink-0 border border-sec/20">
                  <Layers size={14} />
               </div>
               <div className="flex-1">
                 <p className="text-[0.9rem] font-medium text-text leading-relaxed">{entry.text}</p>
                 <span className="text-[0.65rem] text-text-muted uppercase tracking-widest font-bold mt-3 block">
                   Mined on {new Date(entry.timestamp).toLocaleDateString()}
                 </span>
               </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

const StatCard: React.FC<{ value: string | number, label: string, unit?: string, icon?: React.ReactNode, color?: string }> = ({ value, label, unit, icon, color = "text-primary" }) => (
  <div className="bg-surface border border-white/5 rounded-xl p-5 flex flex-col gap-1.5 hover:border-primary/30 transition-colors shadow-sm">
    <div className="text-3xl font-bold text-text font-mono tracking-tight flex items-end gap-1">
      {value} {unit && <span className="text-sm font-normal text-text-muted mb-1">{unit}</span>}
    </div>
    <div className={`text-[0.65rem] uppercase tracking-widest font-bold flex items-center gap-1.5 opacity-90 mt-1 ${color}`}>
      {icon} {label}
    </div>
  </div>
);
