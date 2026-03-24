import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MiningHistoryEntry, Bookmark } from '../types';
import { apiClient } from '../apiClient';

type Theme = 'kiku-dark' | 'kiku-light' | 'matcha';

interface StoreState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  isFocusMode: boolean;
  toggleFocusMode: () => void;
  showAnnotations: boolean;
  toggleAnnotations: () => void;

  // Typography Settings
  readerFont: string;
  setReaderFont: (font: string) => void;
  readerFontSize: number;
  setReaderFontSize: (size: number) => void;
  isVerticalMode: boolean;
  toggleVerticalMode: () => void;

  // Manga Settings
  mangaFitMode: 'fit-screen' | 'fit-width' | 'original';
  setMangaFitMode: (mode: 'fit-screen' | 'fit-width' | 'original') => void;
  mangaFontSize: number;
  setMangaFontSize: (size: number) => void;
  mangaFontFamily: string;
  setMangaFontFamily: (font: string) => void;
  
  isSettingsOpen: boolean;
  isBookmarksOpen: boolean;
  isHistoryOpen: boolean;
  isHelpOpen: boolean;
  isAllBooksOpen: boolean;
  isMangaSettingsOpen: boolean;
  isChaptersOpen: boolean;
  
  openModal: (modalName: string) => void;
  closeModal: (modalName: string) => void;
  toggleChapters: () => void;

  // Anki Integration Config
  ankiField: string;
  ankiPictureField: string;
  ankiAddCover: boolean;
  ankiAddTag: boolean;
  setAnkiSettings: (settings: Partial<Pick<StoreState, 'ankiField' | 'ankiPictureField' | 'ankiAddCover' | 'ankiAddTag'>>) => void;

  // History State
  miningHistory: MiningHistoryEntry[];
  addMiningHistory: (entry: Omit<MiningHistoryEntry, 'id' | 'timestamp'>) => void;
  clearMiningHistory: () => void;

  // Bookmarks
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (id: string) => void;

  // Goals & Streaks
  dailyGoals: {
    cardsMined: number;
    timeReadSeconds: number;
    charactersRead: number;
    wordsRead: number;
  };
  setDailyGoals: (goals: Partial<StoreState['dailyGoals']>) => void;
  lastGoalMetDate: string | null;
  setLastGoalMetDate: (date: string) => void;

  // Pomodoro
  pomodoroTimeLeft: number;
  pomodoroMode: 'focus' | 'break';
  isPomodoroActive: boolean;
  pomodoroFocusDuration: number;
  pomodoroBreakDuration: number;
  pomodoroLastTick: number;
  setPomodoroState: (state: Partial<StoreState>) => void;

  // Annotations
  activeAnnotations: Record<string, string>;
  fetchAnnotations: (bookId: string) => Promise<void>;
  setAnnotation: (bookId: string, subtitleId: string, text: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Theme State
      theme: 'kiku-dark',
      setTheme: (theme) => set({ theme }),
      
      // Layout State
      isSidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      
      // Feature State
      isFocusMode: false,
      toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
      showAnnotations: true,
      toggleAnnotations: () => set((state) => ({ showAnnotations: !state.showAnnotations })),

      // Typography Settings
      readerFont: 'system-ui, -apple-system, sans-serif',
      setReaderFont: (font) => set({ readerFont: font }),
      readerFontSize: 36,
      setReaderFontSize: (size) => set({ readerFontSize: size }),
      isVerticalMode: false,
      toggleVerticalMode: () => set((state) => ({ isVerticalMode: !state.isVerticalMode })),

      // Manga Settings
      mangaFitMode: 'fit-screen',
      setMangaFitMode: (mode) => set({ mangaFitMode: mode }),
      mangaFontSize: 16,
      setMangaFontSize: (size) => set({ mangaFontSize: size }),
      mangaFontFamily: 'Noto Sans JP, sans-serif',
      setMangaFontFamily: (font) => set({ mangaFontFamily: font }),
      
      // Modals State
      isSettingsOpen: false,
      isBookmarksOpen: false,
      isHistoryOpen: false,
      isHelpOpen: false,
      isAllBooksOpen: false,
      isMangaSettingsOpen: false,
      isChaptersOpen: false,
      
      openModal: (modalName) => set({ [modalName as keyof StoreState]: true }),
      closeModal: (modalName) => set({ [modalName as keyof StoreState]: false }),
      toggleChapters: () => set((state) => ({ isChaptersOpen: !state.isChaptersOpen })),

      // Anki Config defaults
      ankiField: 'SentenceAudio',
      ankiPictureField: 'Picture',
      ankiAddCover: true,
      ankiAddTag: true,
      setAnkiSettings: (settings) => set({ ...settings }),

      // History
      miningHistory: [],
      addMiningHistory: (entry) => set((state) => {
        const newEntry: MiningHistoryEntry = {
          ...entry,
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
          timestamp: Date.now(),
        };
        // Keep last 200 entries (matching legacy behavior)
        const newHistory = [newEntry, ...state.miningHistory].slice(0, 200);
        
        apiClient.addMiningHistory(newEntry).catch(console.warn);
        
        return { miningHistory: newHistory };
      }),
      clearMiningHistory: () => set({ miningHistory: [] }),

      // Bookmarks Network Synchronization
      bookmarks: [],
      addBookmark: (bookmark) => set((state) => {
        const payload = [bookmark, ...state.bookmarks];
        apiClient.addBookmark(bookmark).catch(console.warn);
        return { bookmarks: payload };
      }),
      removeBookmark: (id) => set((state) => {
        const payload = state.bookmarks.filter(b => b.id !== id);
        apiClient.removeBookmark(id).catch(console.warn);
        return { bookmarks: payload };
      }),

      // Goals Config
      dailyGoals: {
        cardsMined: 10,
        timeReadSeconds: 1800, // 30 minutes
        charactersRead: 5000,
        wordsRead: 1000
      },
      setDailyGoals: (goals) => set((state) => {
        const newMap = { ...state.dailyGoals, ...goals };
        apiClient.updateGoals(newMap).catch(console.warn);
        return { dailyGoals: newMap };
      }),
      lastGoalMetDate: null,
      setLastGoalMetDate: (date) => {
        apiClient.updateLastGoalDate(date).catch(console.warn);
        set({ lastGoalMetDate: date });
      },

      // Pomodoro defaults
      pomodoroTimeLeft: 25 * 60,
      pomodoroMode: 'focus',
      isPomodoroActive: false,
      pomodoroFocusDuration: 25,
      pomodoroBreakDuration: 5,
      pomodoroLastTick: Date.now(),
      setPomodoroState: (newState) => set((state) => ({ ...state, ...newState })),

      // Annotations Engine
      activeAnnotations: {},
      fetchAnnotations: async (bookId) => {
        try {
          const ann = await apiClient.getAnnotations(bookId);
          set({ activeAnnotations: ann });
        } catch (e) {
          console.warn("Failed to fetch annotations natively.");
        }
      },
      setAnnotation: (bookId, subtitleId, text) => {
        set((state) => {
          const newAnn = { ...state.activeAnnotations };
          if (!text || text.trim() === '') {
            delete newAnn[subtitleId];
          } else {
            newAnn[subtitleId] = text;
          }
          // Silent Background API Sync
          apiClient.saveAnnotation(bookId, subtitleId, text).catch(console.warn);
          return { activeAnnotations: newAnn };
        });
      },
    }),
    {
      name: 'kikiyomi-settings',
      partialize: (state) => ({ 
        theme: state.theme,
        readerFont: state.readerFont,
        readerFontSize: state.readerFontSize,
        isVerticalMode: state.isVerticalMode,
        isSidebarCollapsed: state.isSidebarCollapsed,
        showAnnotations: state.showAnnotations,
        ankiField: state.ankiField,
        ankiPictureField: state.ankiPictureField,
        ankiAddCover: state.ankiAddCover,
        ankiAddTag: state.ankiAddTag,
        miningHistory: state.miningHistory,
        pomodoroFocusDuration: state.pomodoroFocusDuration,
        pomodoroBreakDuration: state.pomodoroBreakDuration,
        pomodoroTimeLeft: state.pomodoroTimeLeft,
        pomodoroMode: state.pomodoroMode,
        isPomodoroActive: state.isPomodoroActive,
        pomodoroLastTick: state.pomodoroLastTick
      }),
    }
  )
);
