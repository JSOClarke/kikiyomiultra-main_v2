import { create } from 'zustand';
import { Book, Subtitle } from '../types';
import { Token } from '../utils/tokenizers';
import { apiClient } from '../apiClient';

let syncProgressTimeout: ReturnType<typeof setTimeout>;
const queueProgressSync = (bookId: string, index: number, time: number) => {
  clearTimeout(syncProgressTimeout);
  syncProgressTimeout = setTimeout(() => {
    apiClient.updateBookProgress(bookId, { savedIndex: index, savedTime: time }).catch(console.warn);
  }, 1000);
};

// Bracket-Aware Comma Splitter for real-time UI toggling
function splitTextByCommasQuotesAware(text: string): string[] {
    const openBrackets = new Set(['「', '『', '（', '(', '【', '《', '〈', '〔', '“', '‘']);
    const closeBrackets = new Set(['」', '』', '）', ')', '】', '》', '〉', '〕', '”', '’']);
    const commaSplitters = new Set(['、', ',']);
    
    let parts: string[] = [];
    let currentPart = "";
    let nestingLevel = 0;
    let ambiguousQuoteIn = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        currentPart += char;
        
        if (char === '"' || char === "'") {
           ambiguousQuoteIn = !ambiguousQuoteIn;
           if (ambiguousQuoteIn) nestingLevel++; else nestingLevel = Math.max(0, nestingLevel - 1);
        } else if (openBrackets.has(char)) {
            nestingLevel++;
        } else if (closeBrackets.has(char)) {
            nestingLevel = Math.max(0, nestingLevel - 1);
        }
        
        if (nestingLevel === 0 && commaSplitters.has(char)) {
            let nextIter = i + 1;
            let flush = true;
            if (nextIter < text.length) {
                const nextChar = text[nextIter];
                if (commaSplitters.has(nextChar) || closeBrackets.has(nextChar)) flush = false;
            }
            if (flush) {
                parts.push(currentPart);
                currentPart = "";
            }
        }
    }
    if (currentPart.length > 0) parts.push(currentPart);
    return parts;
}


interface PlayerState {
  activeBook: Book | null;
  setActiveBook: (book: Book) => void;
  
  audioRef: HTMLAudioElement | null;
  setAudioRef: (ref: HTMLAudioElement | null) => void;
  
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  
  // Unified State (Both Audio and Text)
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  
  // Token Navigation State
  isTokenNavMode: boolean;
  navTokens: Token[];
  activeTokenIndex: number;
  
  togglePlay: () => void;
  seekTo: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  skipToNextSubtitle: () => void;
  skipToPreviousSubtitle: () => void;
  
  updateCurrentTime: (time: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setDuration: (duration: number) => void;
  
  // Token Nav Actions
  toggleTokenNavMode: () => void;
  setNavTokens: (tokens: Token[]) => void;
  setActiveTokenIndex: (index: number) => void;

  // Parser State
  isParsing: boolean;
  parseProgress: number;
  setParsingState: (isParsing: boolean, progress?: number) => void;

  // Modifiers
  toggleCommaSplit: () => void;

  // Library State
  library: Book[];
  addBookToLibrary: (book: Book) => void;
  deleteBook: (id: string) => void;

  // Anki Mining State
  markSubtitleMined: (subtitleId: string) => void;
}

export const usePlayerStore = create<PlayerState>()(
    (set, get) => ({
      // --- BOOK DATA ---
  activeBook: null,
  setActiveBook: (book) => set((state) => {
    let finalSubs = book.subtitles || [];
    if (book.splitByCommas && book.originalSubtitles) {
      finalSubs = [];
      book.originalSubtitles.forEach(sub => {
        const parts = splitTextByCommasQuotesAware(sub.text);
        parts.forEach((p, j) => {
           if (p.trim().length > 1) {
               finalSubs.push({ ...sub, id: `${sub.id}_c${j}`, text: p.trim() });
           }
        });
      });
    }
    const finalBook = { ...book, subtitles: finalSubs };

    // Also ensure this book exists in the library for persistence
    const exists = state.library.some(b => b.id === finalBook.id);
    const newLib = exists ? state.library.map(b => b.id === finalBook.id ? finalBook : b) : [finalBook, ...state.library];
    
    return { 
      activeBook: finalBook, 
      library: newLib,
      activeIndex: finalBook.savedIndex || 0, 
      currentTime: finalBook.savedTime || 0, 
      isPlaying: false,
      duration: finalBook.type === 'audiobook' ? finalBook.duration : undefined 
    };
  }),
  
  // --- AUDIO LOGIC ---
  audioRef: null,
  setAudioRef: (ref) => set({ audioRef: ref }),

  // --- PLAYBACK STATE ---
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,

  // --- UNIFIED STATE ---
  activeIndex: 0,
  setActiveIndex: (index) => set((state) => {
    if (!state.activeBook) return { activeIndex: index };
    
    // Update the library model so we retain progress on the dashboard
    const updatedBook = { ...state.activeBook, savedIndex: index };
    const newLib = state.library.map(b => b.id === updatedBook.id ? updatedBook : b);
    
    // Background Server Sync
    queueProgressSync(updatedBook.id, index, updatedBook.savedTime || 0);

    return { 
      activeIndex: index,
      activeBook: updatedBook,
      library: newLib
    };
  }),

  // --- TOKEN NAV STATE ---
  isTokenNavMode: false,
  navTokens: [],
  activeTokenIndex: -1,

  // --- PARSER STATE ---
  isParsing: false,
  parseProgress: 0,
  setParsingState: (isParsing, progress = 0) => set({ isParsing, parseProgress: progress }),

  // --- LIBRARY STATE ---
  library: [], // Strictly wait for Backend payload
  addBookToLibrary: (book) => set((state) => {
    // Replace if exists, else prepend
    const existingIndex = state.library.findIndex(b => b.id === book.id);
    if (existingIndex > -1) {
      const newLib = [...state.library];
      newLib[existingIndex] = book;
      return { library: newLib };
    }
    return { library: [book, ...state.library] };
  }),
  deleteBook: (id) => set((state) => {
    apiClient.deleteBook(id).catch(console.error); // Emit cascading network destruction
    
    const newLib = state.library.filter(b => b.id !== id);
    if (state.activeBook?.id === id) {
       return { 
         library: newLib, 
         activeBook: newLib.length > 0 ? newLib[0] : null,
         activeIndex: 0,
         currentTime: 0
       };
    }
    return { library: newLib };
  }),

  // --- ANKI MINING STATE ---
  markSubtitleMined: (subtitleId) => set((state) => {
    if (!state.activeBook) return state;

    const newSubtitles = state.activeBook.subtitles.map(sub => 
      sub.id === subtitleId ? { ...sub, isMined: true } : sub
    );

    const updatedBook = { ...state.activeBook, subtitles: newSubtitles };
    
    // Also update library
    const existingIndex = state.library.findIndex(b => b.id === updatedBook.id);
    const newLib = [...state.library];
    if (existingIndex > -1) {
      newLib[existingIndex] = updatedBook;
    }

    return { activeBook: updatedBook, library: newLib };
  }),

  // --- ACTIONS ---
  togglePlay: () => {
    const { audioRef, isPlaying } = get();
    if (!audioRef) return;
    
    if (isPlaying) {
      audioRef.pause();
    } else {
      audioRef.play().catch(console.error);
    }
    set({ isPlaying: !isPlaying });
  },

  seekTo: (time) => {
    const { audioRef } = get();
    if (audioRef) {
      audioRef.currentTime = time;
      set({ currentTime: time });
    }
  },

  setPlaybackRate: (rate) => {
    const { audioRef } = get();
    if (audioRef) {
      audioRef.playbackRate = rate;
      set({ playbackRate: rate });
    }
  },

  skipToNextSubtitle: () => {
    const { activeBook, currentTime, seekTo, isTokenNavMode, activeTokenIndex, navTokens, activeIndex, setActiveIndex } = get();
    
    // Intercept if in Token Navigation Mode
    if (isTokenNavMode && navTokens.length > 0) {
      if (activeTokenIndex < navTokens.length - 1) {
        let nextIndex = activeTokenIndex + 1;
        // Skip over non-words (punctuation, spaces)
        while (nextIndex < navTokens.length && !navTokens[nextIndex].isWordLike) {
          nextIndex++;
        }
        if (nextIndex < navTokens.length) {
          set({ activeTokenIndex: nextIndex });
        }
      }
      return;
    }

    if (!activeBook?.subtitles) return;
    const subs = activeBook.subtitles;
    
    if (activeBook.type === 'epub') {
       // EPUB Mode: Simply increment activeIndex
       if (activeIndex < subs.length - 1) {
         setActiveIndex(activeIndex + 1);
       }
       return;
    }
    
    // Audiobook Mode: Find the current or next subtitle by time
    const nextSub = subs.find(sub => sub.startTime > currentTime + 0.1); 
    if (nextSub) {
      seekTo(nextSub.startTime + 0.001);
    }
  },

  skipToPreviousSubtitle: () => {
    const { activeBook, currentTime, seekTo, isTokenNavMode, activeTokenIndex, navTokens, activeIndex, setActiveIndex } = get();
    
    // Intercept if in Token Navigation Mode
    if (isTokenNavMode && navTokens.length > 0) {
      if (activeTokenIndex > 0) {
        let prevIndex = activeTokenIndex - 1;
        // Skip over non-words (punctuation, spaces)
        while (prevIndex >= 0 && !navTokens[prevIndex].isWordLike) {
          prevIndex--;
        }
        if (prevIndex >= 0) {
          set({ activeTokenIndex: prevIndex });
        }
      }
      return;
    }

    if (!activeBook?.subtitles) return;
    const subs = activeBook.subtitles;
    
    if (activeBook.type === 'epub') {
       // EPUB Mode: Simply decrement activeIndex
       if (activeIndex > 0) {
         setActiveIndex(activeIndex - 1);
       }
       return;
    }
    
    // Audiobook Mode: Find the last subtitle that started BEFORE the current time (minus a small buffer)
    let prevSub = null;
    for (let i = subs.length - 1; i >= 0; i--) {
      if (subs[i].startTime < currentTime - 1.0) { // 1 second buffer to allow restarting current line vs skipping to prev
        prevSub = subs[i];
        break;
      }
    }
    
    if (prevSub) {
      seekTo(prevSub.startTime + 0.001);
    } else if (subs.length > 0) {
      // If we are near the very beginning, just reset to 0
      seekTo(0);
    }
  },

  // Called continually via the <audio> elements onTimeUpdate event
  updateCurrentTime: (time) => {
    const { activeBook } = get();
    
    // Derive active index based on audio timeline
    let newActiveIndex = -1;
    if (activeBook?.subtitles && activeBook.type === 'audiobook') {
      const subs = activeBook.subtitles;
      for (let i = subs.length - 1; i >= 0; i--) {
        if (time >= subs[i].startTime) {
          newActiveIndex = i;
          break;
        }
      }
    }

    set((state) => {
      let newState: Partial<PlayerState> = { currentTime: time };
      
      let updatedBook = state.activeBook;
      let newLib = state.library;
      
      if (state.activeBook) {
        updatedBook = { ...state.activeBook, savedTime: time };
        if (newActiveIndex !== -1 && newActiveIndex !== state.activeIndex) {
          newState.activeIndex = newActiveIndex;
          updatedBook.savedIndex = newActiveIndex;
        }
        newLib = state.library.map(b => b.id === updatedBook!.id ? updatedBook! : b);
      }
      
      // Background Server Sync
      if (updatedBook) {
        queueProgressSync(updatedBook.id, updatedBook.savedIndex || 0, time);
      }

      return { 
        ...newState,
        activeBook: updatedBook,
        library: newLib
      };
    });
  },
  
  // Called when audio loads or ends
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setDuration: (duration) => set({ duration }),
  
  // --- TOKEN NAV ACTIONS ---
  toggleTokenNavMode: () => {
    const { isTokenNavMode } = get();
    set({ 
      isTokenNavMode: !isTokenNavMode,
      // Reset variables when leaving mode
      activeTokenIndex: -1,
    });
  },
  
  setNavTokens: (tokens) => {
    // When tokens are set (entering nav mode), automatically find the first actual word token
    let firstWordIndex = -1;
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].isWordLike) {
            firstWordIndex = i;
            break;
        }
    }
    set({ navTokens: tokens, activeTokenIndex: firstWordIndex });
  },
  
  setActiveTokenIndex: (index) => set({ activeTokenIndex: index }),

  // --- MODIFIERS ---
  toggleCommaSplit: () => {
    const { activeBook, activeIndex } = get();
    if (!activeBook || activeBook.type !== 'epub' || !activeBook.originalSubtitles) return;
    
    // Find ID of the currently active line so we can restore the reading position
    const currentSubId = activeBook.subtitles[activeIndex]?.id;
    
    const newSplitSetting = !activeBook.splitByCommas;
    let newSubs: Subtitle[] = [];
    
    if (newSplitSetting) {
      activeBook.originalSubtitles.forEach(sub => {
        const parts = splitTextByCommasQuotesAware(sub.text);
        parts.forEach((p, j) => {
           if (p.trim().length > 1) {
               newSubs.push({ ...sub, id: `${sub.id}_c${j}`, text: p.trim() });
           }
        });
      });
    } else {
      newSubs = [...activeBook.originalSubtitles];
    }
    
    // Attempt to calculate new activeIndex based on the original sub ID
    const baseId = currentSubId ? currentSubId.split('_c')[0] : '';
    let newIndex = newSubs.findIndex((s: any) => s.id === baseId || s.id.startsWith(baseId + '_c'));
    if (newIndex === -1) newIndex = 0;
    
    set((state) => {
      const updatedBook = { 
        ...activeBook, 
        splitByCommas: newSplitSetting, 
        subtitles: newSubs, 
        savedIndex: newIndex 
      };
      
      // Dispatch explicit Cloud sync so secondary laptops inherit split formatting correctly
      apiClient.updateBookProgress(updatedBook.id, { 
         savedIndex: newIndex, 
         savedTime: updatedBook.savedTime || 0, 
         splitByCommas: newSplitSetting 
      }).catch(console.warn);

      const newLib = state.library.map(b => b.id === updatedBook.id ? updatedBook : b);
      return {
         activeBook: updatedBook,
         library: newLib,
         activeIndex: newIndex
      };
    });
  }
}));
