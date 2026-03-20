import { create } from 'zustand';
import { DailyStats, DailyBookStats } from '../types';
import { apiClient } from '../apiClient';
import { tokenizers } from '../utils/tokenizers';

interface StatsState {
  // Dictionary mapping YYYY-MM-DD strings to DailyStats
  dailyRecords: Record<string, DailyStats>;
  
  // Set of subtitle IDs seen in the current session so we don't double-count characters 
  // when rewinding. (Not persisted across page refreshes, which is intentional for a session).
  sessionSeenSubtitles: Set<string>;
  
  // Action to get or initialize today's record
  getTodayRecord: () => DailyStats;
  
  // Aggregate Selectors
  getTodayTotalTime: () => number;
  getTodayTotalCharacters: () => number;
  getTodayTotalWords: () => number;
  getAggregateStatsForBook: (bookId: string) => DailyBookStats;

  // Update Tracking (Now requires Book ID for true mapping)
  addTime: (seconds: number, bookId: string) => void;
  addCharacters: (text: string, subtitleId: string, bookId: string) => void;
}

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const useStatsStore = create<StatsState>()(
    (set, get) => ({
      dailyRecords: {},
      sessionSeenSubtitles: new Set<string>(),

      getTodayRecord: () => {
        const today = getTodayString();
        const records = get().dailyRecords;
        
        if (records[today]) {
          const rec = records[today];
          // Backward compatibility for older records
          if (!rec.books) {
            return { ...rec, books: {} };
          }
          return rec;
        }
        
        // Initialize a new day
        return {
          date: today,
          books: {}
        };
      },

      getTodayTotalTime: () => Object.values(get().getTodayRecord().books || {}).reduce((sum, b) => sum + (b.timeReadSeconds || 0), 0),
      getTodayTotalCharacters: () => Object.values(get().getTodayRecord().books || {}).reduce((sum, b) => sum + (b.charactersRead || 0), 0),
      getTodayTotalWords: () => Object.values(get().getTodayRecord().books || {}).reduce((sum, b) => sum + (b.wordsRead || 0), 0),
      getAggregateStatsForBook: (bookId: string) => {
        const records = get().dailyRecords;
        let timeReadSeconds = 0;
        let charactersRead = 0;
        let wordsRead = 0;
        Object.values(records).forEach(day => {
          if (day.books && day.books[bookId]) {
            timeReadSeconds += (day.books[bookId].timeReadSeconds || 0);
            charactersRead += (day.books[bookId].charactersRead || 0);
            wordsRead += (day.books[bookId].wordsRead || 0);
          }
        });
        return { timeReadSeconds, charactersRead, wordsRead };
      },

      addTime: (seconds, bookId) => set((state) => {
        const today = getTodayString();
        const currentRecord = state.getTodayRecord();
        const books = currentRecord.books || {};
        const currentBook = books[bookId] || { timeReadSeconds: 0, charactersRead: 0, wordsRead: 0 };
        
        const nextRecords = {
          ...state.dailyRecords,
          [today]: {
            ...currentRecord,
            books: {
              ...books,
              [bookId]: {
                ...currentBook,
                timeReadSeconds: (currentBook.timeReadSeconds || 0) + seconds
              }
            }
          }
        };
        
        apiClient.syncDailyRecord({ date: today, record: nextRecords[today] }).catch(console.warn);
        
        return { dailyRecords: nextRecords };
      }),

      addCharacters: (text, subtitleId, bookId) => {
        const { sessionSeenSubtitles, getTodayRecord } = get();
        
        // Prevent double counting if rewinding exactly over a line
        if (sessionSeenSubtitles.has(subtitleId)) {
          return;
        }

        const chars = text.replace(/\s+/g, '').length;
        const words = tokenizers.getTokenizer().tokenize(text).filter(t => t.isWordLike).length;

        set((state) => {
          const today = getTodayString();
          const currentRecord = getTodayRecord();
          const books = currentRecord.books || {};
          const currentBook = books[bookId] || { timeReadSeconds: 0, charactersRead: 0, wordsRead: 0 };
          
          const newSeen = new Set(state.sessionSeenSubtitles);
          newSeen.add(subtitleId);

          const nextRecords = {
            ...state.dailyRecords,
            [today]: {
              ...currentRecord,
              books: {
                ...books,
                [bookId]: {
                  ...currentBook,
                  charactersRead: (currentBook.charactersRead || 0) + chars,
                  wordsRead: (currentBook.wordsRead || 0) + words
                }
              }
            }
          };
          
          apiClient.syncDailyRecord({ date: today, record: nextRecords[today] }).catch(console.warn);

          return {
            sessionSeenSubtitles: newSeen,
            dailyRecords: nextRecords
          };
        });
      }
    })
);
