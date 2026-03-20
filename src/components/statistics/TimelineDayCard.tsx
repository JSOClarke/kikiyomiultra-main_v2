import React from 'react';
import { TimelineDay } from '../../types';
import { CalendarDays, Clock, Layers, Type, BookOpen } from 'lucide-react';

export const TimelineDayCard: React.FC<{ day: TimelineDay }> = ({ day }) => {
  // Translate the standardized YYYY-MM-DD key gracefully mitigating TZ shifting vulnerabilities
  const dateObj = new Date(day.date + 'T12:00:00Z');
  const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  return (
    <div className="relative pl-6 md:pl-0">
      {/* Desktop Timeline Node */}
      <div className="hidden md:flex absolute left-[3.5rem] top-6 w-4 h-4 rounded-full bg-sec shadow-[0_0_10px_rgba(var(--sec),0.8)] z-10 -translate-x-1/2" />
      
      {/* Mobile Timeline Node */}
      <div className="md:hidden absolute left-0 top-6 w-3 h-3 rounded-full bg-sec shadow-[0_0_10px_rgba(var(--sec),0.8)] z-10 -translate-x-[calc(50%-1px)]" />

      <div className="bg-surface border border-white/5 rounded-2xl p-5 md:ml-[5.5rem] shadow-sm hover:border-white/10 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-white/5 pb-4">
          <h3 className="text-lg font-bold text-text tracking-tight flex items-center gap-2">
            <CalendarDays size={18} className="text-sec" /> {formattedDate}
          </h3>
          <div className="flex items-center gap-3 md:gap-4 text-xs font-mono font-bold tracking-wider text-text-muted">
             <span className="flex items-center gap-1.5"><Clock size={14} /> {formatTime(day.totalTimeSeconds)}</span>
             <span className="flex items-center gap-1.5"><Type size={14} className="text-primary" /> {day.totalWords.toLocaleString()} w</span>
             <span className="flex items-center gap-1.5"><Layers size={14} className="text-sec" /> {day.cardsMined} crd</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {day.books.map((b, i) => (
            <div key={i} className="bg-bg border border-white/5 rounded-xl p-3 flex items-start gap-3 hover:border-white/10 transition-colors">
              <div className="w-8 h-10 rounded bg-surface border border-white/5 flex items-center justify-center shrink-0">
                 <BookOpen size={16} className="text-text-muted opacity-50" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-text truncate mb-1">{b.bookTitle}</p>
                <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-widest font-bold text-text-muted">
                   <span className="opacity-80 flex items-center gap-1"><Clock size={10}/> {formatTime(b.timeReadSeconds)}</span>
                   <span className="opacity-40">•</span>
                   <span className="opacity-80 flex items-center gap-1"><Type size={10}/> {b.wordsRead.toLocaleString()}</span>
                   {b.cardsMined > 0 && (
                     <>
                       <span className="opacity-40">•</span>
                       <span className="text-sec flex items-center gap-1"><Layers size={10}/> {b.cardsMined}</span>
                     </>
                   )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {day.minedCardEntries && day.minedCardEntries.length > 0 && (
          <div className="mt-8 pt-6 border-t border-dashed border-white/10 relative">
             <div className="absolute top-0 left-4 -translate-y-1/2 bg-surface px-4 text-[0.65rem] uppercase tracking-[0.2em] text-sec font-bold flex items-center gap-2 border border-white/5 rounded-full py-1 shadow-sm">
               <Layers size={12}/> Target Mining Log ({day.minedCardEntries.length})
             </div>
             
             <div className="flex flex-col gap-2 mt-2">
               {day.minedCardEntries.map((card: any, i: number) => (
                 <div key={i} className="px-4 py-3 bg-bg border border-white/5 hover:border-sec/30 hover:bg-surface-hover transition-colors rounded-xl flex flex-col md:flex-row md:items-start justify-between gap-4 group">
                    <div className="flex-1">
                      <p className="text-text font-medium text-[0.9rem] leading-relaxed whitespace-pre-wrap">
                        {card.text}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                      {card.bookTitle && (
                        <span className="text-[0.65rem] font-bold tracking-wider text-sec max-w-[150px] truncate">
                          {card.bookTitle}
                        </span>
                      )}
                      <span className="text-[0.65rem] font-mono tracking-wider text-text-muted opacity-50 group-hover:opacity-100 transition-opacity">
                         {new Date(card.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
