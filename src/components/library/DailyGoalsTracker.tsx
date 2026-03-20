import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useStatsStore } from '../../store/useStatsStore';
import { calculateCurrentStreak } from '../../utils/streaks';

export const DailyGoalsTracker: React.FC = () => {
  const { dailyGoals, miningHistory } = useStore();
  const getTodayTotalTime = useStatsStore(state => state.getTodayTotalTime);
  const getTodayTotalCharacters = useStatsStore(state => state.getTodayTotalCharacters);
  const getTodayTotalWords = useStatsStore(state => state.getTodayTotalWords);
  const dailyRecords = useStatsStore(state => state.dailyRecords);

  // Auto-refresh the progress bars every second if active
  const [totals, setTotals] = useState({ time: 0, chars: 0, words: 0 });
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const updateStats = () => {
      setTotals({
        time: getTodayTotalTime(),
        chars: getTodayTotalCharacters(),
        words: getTodayTotalWords(),
      });
      setStreak(calculateCurrentStreak(dailyRecords, miningHistory, dailyGoals));
    };
    
    updateStats(); // Initial set
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [getTodayTotalTime, getTodayTotalCharacters, getTodayTotalWords, dailyRecords, miningHistory, dailyGoals]);

  const formatTime = (seconds: number) => {
    if (seconds === 0) return "0m";
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
  };

  // Calculate cards created today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const cardsToday = miningHistory.filter(m => m.timestamp >= startOfToday.getTime()).length;

  // Calculate progress
  const timeProgress = dailyGoals.timeReadSeconds > 0 ? Math.min(100, Math.round((totals.time / dailyGoals.timeReadSeconds) * 100)) : 100;
  const cardsProgress = dailyGoals.cardsMined > 0 ? Math.min(100, Math.round((cardsToday / dailyGoals.cardsMined) * 100)) : 100;
  const charsProgress = dailyGoals.charactersRead > 0 ? Math.min(100, Math.round((totals.chars / dailyGoals.charactersRead) * 100)) : 100;
  const wordsProgress = dailyGoals.wordsRead > 0 ? Math.min(100, Math.round((totals.words / dailyGoals.wordsRead) * 100)) : 100;

  // Determine if streak is "hot" (meaning today's goal is met)
  const isStreakHot = timeProgress === 100 || cardsProgress === 100 || charsProgress === 100 || wordsProgress === 100;

  return (
    <div className="w-full bg-surface border border-black/5 dark:border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-2xl p-5 md:p-6 mb-6 flex flex-col md:flex-row items-center gap-6 md:gap-10 transition-all">
      
      {/* Streak Fire Display */}
      <div className="flex items-center gap-4 min-w-[140px] justify-center md:justify-start">
        <div className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-500 ${isStreakHot ? 'bg-orange-500/10' : 'bg-border'}`}>
          <Flame 
            size={36} 
            className={`transition-all duration-500 ${isStreakHot ? 'text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'text-text-muted opacity-50'}`} 
            fill={isStreakHot ? "currentColor" : "none"} 
          />
        </div>
        <div className="flex flex-col">
          <span className="text-3xl font-black tracking-tight text-text leading-none">{streak}</span>
          <span className="text-[0.65rem] text-text-muted uppercase tracking-widest font-bold mt-1">Day Streak</span>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="flex-1 w-full grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <MiniProgressBar label="Reading Time" percent={timeProgress} color="bg-blue-500" text={formatTime(totals.time)} target={formatTime(dailyGoals.timeReadSeconds)} />
        <MiniProgressBar label="Cards Mined" percent={cardsProgress} color="bg-green-500" text={cardsToday.toString()} target={dailyGoals.cardsMined.toString()} />
        <MiniProgressBar label="Chars Read" percent={charsProgress} color="bg-purple-500" text={totals.chars.toLocaleString()} target={dailyGoals.charactersRead.toLocaleString()} />
        <MiniProgressBar label="Words Read" percent={wordsProgress} color="bg-primary" text={totals.words.toLocaleString()} target={dailyGoals.wordsRead.toLocaleString()} />
      </div>

    </div>
  );
};

interface MiniProgressBarProps {
  label: string;
  percent: number;
  color: string;
  text: string;
  target: string;
}

const MiniProgressBar: React.FC<MiniProgressBarProps> = ({ label, percent, color, text, target }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-end">
        <span className="text-[0.65rem] text-text-muted uppercase tracking-widest font-bold">{label}</span>
        <span className="text-xs font-mono font-bold text-text">{text} <span className="text-text-muted/50 font-sans mx-0.5">/</span> <span className="text-text-muted">{target}</span></span>
      </div>
      <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500 rounded-full`} 
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
