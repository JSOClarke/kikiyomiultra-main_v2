import React, { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useStatsStore } from '../../store/useStatsStore';
import { useStore } from '../../store/useStore';

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * A silent, hidden engine that runs globally to monitor playback
 * and synchronize active metrics (Time Read, Characters) into the Stats Store.
 */
export const Tracker: React.FC = () => {
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const activeBook = usePlayerStore(state => state.activeBook);
  const activeIndex = usePlayerStore(state => state.activeIndex);
  
  const addTime = useStatsStore(state => state.addTime);
  const addCharacters = useStatsStore(state => state.addCharacters);

  const location = useLocation();
  const isPlayerPage = location.pathname === '/player';

  // --- TIME TRACKER ---
  useEffect(() => {
    if (!activeBook) return;

    let lastInteraction = Date.now();
    const handleActivity = () => { lastInteraction = Date.now(); };

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('wheel', handleActivity, { passive: true });

    // Tick every 5 seconds to reduce state writes
    const interval = setInterval(() => {
      const isReadingManually = isPlayerPage && (Date.now() - lastInteraction < 60000);
      
      if (isPlaying || isReadingManually) {
        addTime(5, activeBook.id);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('wheel', handleActivity);
    };
  }, [isPlaying, activeBook, addTime, isPlayerPage]);

  // --- CHARACTER TRACKER ---
  const lastTrackedId = React.useRef<string | null>(null);

  useEffect(() => {
    if (!activeBook || !activeBook.subtitles || activeIndex < 0 || activeIndex >= activeBook.subtitles.length) return;
    
    const currentSub = activeBook.subtitles[activeIndex];
    if (!currentSub || !currentSub.text) return;

    // If the user isn't actually reading (e.g. Dashboard), sync the tracker to prevent free points later, but don't claim them now
    if (!isPlayerPage) {
      lastTrackedId.current = currentSub.id;
      return;
    }

    // Veto initial mount hydration so users don't get free points for refreshing the browser natively
    if (lastTrackedId.current === null) {
      lastTrackedId.current = currentSub.id;
      return; 
    }
    
    // The player navigated to a new active index. Record the characters!
    if (lastTrackedId.current !== currentSub.id) {
      addCharacters(currentSub.text, currentSub.id, activeBook.id);
      lastTrackedId.current = currentSub.id;
    }
  }, [activeIndex, activeBook, addCharacters]);

  // --- GOAL CELEBRATION TRACKER ---
  const minings = useStore(state => state.miningHistory);
  const dailyRecords = useStatsStore(state => state.dailyRecords);
  const getTodayTotalTime = useStatsStore(state => state.getTodayTotalTime);
  const getTodayTotalCharacters = useStatsStore(state => state.getTodayTotalCharacters);
  const getTodayTotalWords = useStatsStore(state => state.getTodayTotalWords);
  const dailyGoals = useStore(state => state.dailyGoals);
  const lastGoalMetDate = useStore(state => state.lastGoalMetDate);
  const setLastGoalMetDate = useStore(state => state.setLastGoalMetDate);

  useEffect(() => {
    const today = getTodayString();
    
    // If we've already celebrated today, skip to save performance
    if (lastGoalMetDate === today) return;

    // Calculate today's miners
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const cardsToday = minings.filter(m => m.timestamp >= startOfToday.getTime()).length;

    const timeRead = getTodayTotalTime();
    const charsRead = getTodayTotalCharacters();
    const wordsRead = getTodayTotalWords();

    // Did we meet ANY goal?
    const hasMetGoal = 
      (dailyGoals.timeReadSeconds > 0 && timeRead >= dailyGoals.timeReadSeconds) ||
      (dailyGoals.cardsMined > 0 && cardsToday >= dailyGoals.cardsMined) ||
      (dailyGoals.charactersRead > 0 && charsRead >= dailyGoals.charactersRead) ||
      (dailyGoals.wordsRead > 0 && wordsRead >= dailyGoals.wordsRead);

    if (hasMetGoal) {
      setLastGoalMetDate(today);
      toast.success("🎉 Congratulations! You reached your daily reading goal! 🔥", {
        duration: 5000,
        style: {
          border: '1px solid rgba(var(--primary), 0.5)',
          padding: '16px',
          color: 'var(--text)',
          background: 'var(--bg)',
          boxShadow: '0 10px 30px rgba(var(--primary), 0.2)',
          fontWeight: 'bold',
          fontSize: '1.1rem'
        },
        iconTheme: {
          primary: 'var(--primary)',
          secondary: '#1A1A1A',
        },
      });
    }
  }, [dailyRecords, minings, dailyGoals, lastGoalMetDate, setLastGoalMetDate]);

  // This component mounts globally but renders nothing.
  return null;
};
