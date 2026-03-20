import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useStatsStore } from '../../store/useStatsStore';
import { useStore } from '../../store/useStore';
import { usePlayerStore } from '../../store/usePlayerStore';

export const DashboardStats: React.FC = () => {
  const getTodayTotalTime = useStatsStore(state => state.getTodayTotalTime);
  const getTodayTotalCharacters = useStatsStore(state => state.getTodayTotalCharacters);
  const getTodayTotalWords = useStatsStore(state => state.getTodayTotalWords);
  const getTodayRecord = useStatsStore(state => state.getTodayRecord);
  const minings = useStore(state => state.miningHistory);
  const library = usePlayerStore(state => state.library);

  // Set up a tiny 1-second refresh so the dashboard looks "live" if active
  const [stats, setStats] = useState({
    time: getTodayTotalTime(),
    chars: getTodayTotalCharacters(),
    words: getTodayTotalWords(),
    record: getTodayRecord()
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        time: getTodayTotalTime(),
        chars: getTodayTotalCharacters(),
        words: getTodayTotalWords(),
        record: getTodayRecord()
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [getTodayTotalTime, getTodayTotalCharacters, getTodayTotalWords, getTodayRecord]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  // Prepare breakdown data arrays to pass to the individual cards
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const booksObj = stats.record.books || {};
  
  const wordsBreakdown = Object.entries(booksObj).map(([id, bStats]) => {
    const title = library.find(b => b.id === id)?.title || 'Unknown Book';
    return { label: title, value: bStats.wordsRead.toLocaleString() };
  }).filter(b => b.value !== "0");

  const charsBreakdown = Object.entries(booksObj).map(([id, bStats]) => {
    const title = library.find(b => b.id === id)?.title || 'Unknown Book';
    return { label: title, value: bStats.charactersRead.toLocaleString() };
  }).filter(b => b.value !== "0");

  const timeBreakdown = Object.entries(booksObj).map(([id, bStats]) => {
    const title = library.find(b => b.id === id)?.title || 'Unknown Book';
    return { label: title, value: formatTime(bStats.timeReadSeconds) };
  }).filter(b => b.value !== "0m");

  // For cards, we map over the minings array and group by bookTitle
  const cardsTodayMinings = minings.filter(m => m.timestamp >= startOfToday.getTime());
  const cardsToday = cardsTodayMinings.length;
  
  const cardsMap = new Map<string, number>();
  cardsTodayMinings.forEach(m => {
    cardsMap.set(m.bookTitle, (cardsMap.get(m.bookTitle) || 0) + 1);
  });
  
  const cardsBreakdown = Array.from(cardsMap.entries()).map(([title, count]) => ({
    label: title,
    value: count.toString()
  }));

  return (
    <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 items-start">
      <StatCard value={stats.words.toLocaleString()} label="Words Today" breakdown={wordsBreakdown} />
      <StatCard value={stats.chars.toLocaleString()} label="Chars Today" breakdown={charsBreakdown} />
      <StatCard value={formatTime(stats.time)} label="Time Read Today" breakdown={timeBreakdown} />
      <StatCard value={cardsToday} label="Cards Mined" breakdown={cardsBreakdown} />
    </div>
  );
};

interface BreakdownItem {
  label: string;
  value: string | number;
}

interface StatCardProps {
  value: string | number;
  label: string;
  unit?: string;
  breakdown?: BreakdownItem[];
}

const StatCard: React.FC<StatCardProps> = ({ value, label, unit, breakdown }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasBreakdown = breakdown && breakdown.length > 0;

  return (
    <div 
      className={`bg-surface border border-black/5 dark:border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-2xl flex flex-col transition-all hover:shadow-md ${hasBreakdown ? 'cursor-pointer' : ''}`}
      onClick={() => hasBreakdown && setIsExpanded(!isExpanded)}
    >
      <div className="p-5 md:p-6 flex flex-col gap-1.5 relative">
        <div className="text-2xl md:text-3xl font-bold text-text tracking-tight flex items-baseline gap-1">
          {value} {unit && <span className="text-sm font-medium text-text-muted ml-0.5">{unit}</span>}
        </div>
        <div className="text-[0.65rem] text-text-muted uppercase tracking-widest font-bold">
          {label}
        </div>
        
        {hasBreakdown && (
          <div className="absolute top-5 right-5 text-text-muted/50">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </div>

      {/* Dropdown breakdown area */}
      <div 
        className={`grid transition-all duration-300 ease-in-out ${isExpanded && hasBreakdown ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 md:px-6 md:pb-6 pt-0 flex flex-col">
            <div className="w-full h-px bg-border/60 mb-2"></div>
            {breakdown?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
                <span className="text-text-muted text-[0.7rem] font-medium tracking-wide truncate pr-3 flex-1" title={item.label}>
                  {item.label}
                </span>
                <span className="font-mono font-bold text-[0.7rem] text-text bg-surface px-1.5 py-0.5 rounded shadow-sm border border-black/5 dark:border-white/5 shrink-0">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
