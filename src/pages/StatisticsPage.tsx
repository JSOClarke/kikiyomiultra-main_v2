import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useStatsStore } from '../store/useStatsStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useStore } from '../store/useStore';
import { Activity, BookOpen, Clock, Zap, Layers } from 'lucide-react';
import { BookStatCard } from '../components/statistics/BookStatCard';
import { BookDetailView } from '../components/statistics/BookDetailView';
import { DailyActivityTimeline } from '../components/statistics/DailyActivityTimeline';

export const StatisticsPage: React.FC = () => {
  const dailyRecords = useStatsStore(state => state.dailyRecords);
  const library = usePlayerStore(state => state.library);
  const minings = useStore(state => state.miningHistory);
  
  const [activeStatBookId, setActiveStatBookId] = useState<string | null>(null);

  // --- GLOBAL AGGREGATIONS ---
  let totalTimeSeconds = 0;
  let totalChars = 0;
  let totalWords = 0;

  Object.values(dailyRecords).forEach(day => {
    Object.values(day.books || {}).forEach(book => {
      totalTimeSeconds += (book.timeReadSeconds || 0);
      totalChars += (book.charactersRead || 0);
      totalWords += (book.wordsRead || 0);
    });
  });

  const totalDays = Object.keys(dailyRecords).length;
  const globalSpeed = totalTimeSeconds > 0 ? Math.round(totalWords / (totalTimeSeconds / 60)) : 0;
  const totalBooks = library.length;
  const totalCards = minings.length;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  if (activeStatBookId) {
     return (
       <PageContainer scrollable={true}>
         <BookDetailView bookId={activeStatBookId} onBack={() => setActiveStatBookId(null)} />
       </PageContainer>
     );
  }

  return (
    <PageContainer>
      <div className="flex justify-between items-end mb-8 mt-4 w-full px-1 border-b border-black/5 dark:border-white/5 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-text mb-2 tracking-tight">Global Statistics</h1>
          <p className="text-text-muted text-sm tracking-wide">Your complete historical lifetime progress across all content.</p>
        </div>
      </div>

      <div className="w-full flex-1 flex flex-col gap-6">
        {/* All-Time Snapshot */}
        <section className="bg-surface border border-white/5 p-6 rounded-2xl shadow-sm">
           <h2 className="text-lg font-bold text-text mb-6 flex items-center gap-2">
             <Activity size={20} className="text-primary" /> Lifetime Overview
           </h2>
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard value={totalWords.toLocaleString()} label="Total Words" icon={<BookOpen size={16} />} />
              <StatCard value={formatTime(totalTimeSeconds)} label="Total Time Read" icon={<Clock size={16} />} />
              <StatCard value={totalChars.toLocaleString()} label="Total Characters" />
              <StatCard value={globalSpeed} label="Average Speed" unit="wpm" icon={<Zap size={16} />} />
           </div>
        </section>

        {/* Database Stats */}
        <section className="bg-surface border border-white/5 p-6 rounded-2xl shadow-sm">
           <h2 className="text-lg font-bold text-text mb-6">Database & Activity</h2>
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-bg border border-border p-5 flex flex-col items-center justify-center rounded-xl shadow-inner text-center">
                 <span className="text-4xl font-black text-text font-mono mb-2">{totalDays}</span>
                 <span className="text-xs text-text-muted uppercase tracking-wider font-bold">Active Tracking Days</span>
              </div>
              <div className="bg-bg border border-border p-5 flex flex-col items-center justify-center rounded-xl shadow-inner text-center">
                 <span className="text-4xl font-black text-text font-mono mb-2">{totalBooks}</span>
                 <span className="text-xs text-text-muted uppercase tracking-wider font-bold">Books in Library</span>
              </div>
              <div className="bg-bg border border-border p-5 flex flex-col items-center justify-center rounded-xl shadow-inner text-center">
                 <span className="text-4xl font-black text-text font-mono mb-2">{totalCards}</span>
                 <span className="text-xs text-text-muted uppercase tracking-wider font-bold">Total Cards Mined</span>
              </div>
           </div>
        </section>

        {/* Book-Centric Drill-Down Grid */}
        <section className="mt-8 mb-12">
           <h2 className="text-xl font-bold text-text mb-6 border-b border-border pb-3 flex items-center gap-2">
             <Layers size={18} className="text-primary" /> Per-Book Analytics Repository
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {library.map(book => (
                <BookStatCard key={book.id} book={book} onClick={() => setActiveStatBookId(book.id)} />
             ))}
             {library.length === 0 && (
                <div className="col-span-full text-center py-16 text-sm text-text-muted border border-dashed border-white/5 rounded-2xl bg-surface/30">
                  Your library is currently empty. Upload a book to begin tracking your analytics.
                </div>
             )}
           </div>
        </section>

        {/* Historical Timeline Feed */}
        <DailyActivityTimeline />
      </div>
    </PageContainer>
  );
}

interface StatCardProps {
  value: string | number;
  label: string;
  unit?: string;
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, unit, icon }) => {
  return (
    <div className="bg-bg border border-border rounded-xl p-5 flex flex-col gap-2 hover:border-primary/30 transition-colors">
      <div className="text-3xl font-bold text-primary font-mono tracking-tight flex items-end gap-1.5">
        {value} {unit && <span className="text-base font-normal opacity-80 mb-0.5">{unit}</span>}
      </div>
      <div className="text-xs text-text-muted uppercase tracking-widest font-semibold flex items-center gap-1.5 opacity-80">
        {icon} {label}
      </div>
    </div>
  );
};
