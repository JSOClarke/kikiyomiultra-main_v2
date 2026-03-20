import { DailyStats, MiningHistoryEntry } from '../types';

interface GoalsConfig {
  cardsMined: number;
  timeReadSeconds: number;
  charactersRead: number;
  wordsRead: number;
}

/**
 * Calculates a user's current consecutive daily streak based on their goals.
 * To keep a streak alive, the user only has to meet ONE single goal configuration
 * (e.g. read enough characters, or read enough time) on any given day.
 */
export const calculateCurrentStreak = (
  dailyRecords: Record<string, DailyStats>,
  minings: MiningHistoryEntry[],
  goals: GoalsConfig
): number => {
  let streak = 0;
  
  // Start from today and walk backwards
  const currentDate = new Date();
  // Strip hours/minutes to safely decrement calendar days
  currentDate.setHours(0, 0, 0, 0);

  let checkingDateStr = formatDate(currentDate);

  // Is today's goal already met?
  const todayMet = didMeetAnyGoal(checkingDateStr, dailyRecords, minings, goals);
  
  if (todayMet) {
    streak++;
  }

  // Walk backward day by day
  let limit = 0; // Safeguard against infinite loops in edge cases
  while (limit < 1000) {
    // Subtract 1 full day
    currentDate.setDate(currentDate.getDate() - 1);
    const prevDayStr = formatDate(currentDate);

    if (didMeetAnyGoal(prevDayStr, dailyRecords, minings, goals)) {
      streak++;
    } else {
      break; // Streak broken!
    }
    limit++;
  }

  return streak;
};

// --- HELPERS ---

const formatDate = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const didMeetAnyGoal = (
  dateStr: string,
  dailyRecords: Record<string, DailyStats>,
  minings: MiningHistoryEntry[],
  goals: GoalsConfig
): boolean => {
  const record = dailyRecords[dateStr];
  
  // Count Anki cards independently
  const startOfDay = new Date(dateStr + "T00:00:00");
  const endOfDay = new Date(dateStr + "T23:59:59");
  
  const cardsToday = minings.filter(m => {
    const d = new Date(m.timestamp);
    return d >= startOfDay && d <= endOfDay;
  }).length;

  const timeSet = goals.timeReadSeconds > 0;
  const cardsSet = goals.cardsMined > 0;
  const charsSet = goals.charactersRead > 0;
  const wordsSet = goals.wordsRead > 0;

  // If no goals are set strictly at all, assume 0 means disabled.
  // We don't increment streaks if the user turns off all features.
  if (!timeSet && !cardsSet && !charsSet && !wordsSet) return false;

  const getTotals = (record: DailyStats | undefined) => {
    if (!record || !record.books) return { time: 0, chars: 0, words: 0 };
    return Object.values(record.books).reduce((sum, b) => ({
      time: sum.time + (b.timeReadSeconds || 0),
      chars: sum.chars + (b.charactersRead || 0),
      words: sum.words + (b.wordsRead || 0),
    }), { time: 0, chars: 0, words: 0 });
  };

  const totals = getTotals(record);

  if (timeSet && totals.time >= goals.timeReadSeconds) return true;
  if (cardsSet && cardsToday >= goals.cardsMined) return true;
  if (charsSet && totals.chars >= goals.charactersRead) return true;
  if (wordsSet && totals.words >= goals.wordsRead) return true;

  return false;
};
