import fs from 'fs';
import path from 'path';
import os from 'os';

const KIKIYOMI_DATA_ROOT = process.env.KIKIYOMI_DATA_ROOT || path.join(os.homedir(), 'Documents', 'KikiyomiUltraData');
const DATA_DIR = path.join(KIKIYOMI_DATA_ROOT, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'db.json');

// Interface mapping frontend IndexedDB structure to backend JSON
export interface DatabaseSchema {
  books: any[];
  dailyRecords: Record<string, any>;
  dailyGoals: any;
  miningHistory: any[];
  bookmarks: any[];
  lastGoalMetDate: string | null;
  annotations?: Record<string, Record<string, string>>;
}

export const defaultDB: DatabaseSchema = {
  books: [],
  dailyRecords: {},
  dailyGoals: { cardsMined: 10, timeReadSeconds: 1800, charactersRead: 5000, wordsRead: 1000 },
  miningHistory: [],
  bookmarks: [],
  lastGoalMetDate: null,
  annotations: {}
};

// Lazy init DB file on mount
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
}

export function readDB(): DatabaseSchema {
  try {
    const rawData = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.warn("DB read error, returning default:", error);
    return defaultDB;
  }
}

export function writeDB(data: Partial<DatabaseSchema>) {
  const currentDB = readDB();
  const nextDB = { ...currentDB, ...data };
  fs.writeFileSync(DB_FILE, JSON.stringify(nextDB, null, 2));
}

export const db = {
  getBooks: () => readDB().books,
  addBook: (book: any) => {
    const books = readDB().books;
    // Overwrite if exists, otherwise push
    const existingIndex = books.findIndex((b: any) => b.id === book.id);
    if (existingIndex > -1) {
      books[existingIndex] = book;
    } else {
      books.push(book);
    }
    writeDB({ books });
  },
  deleteBook: (id: string) => {
    const books = readDB().books.filter((b: any) => b.id !== id);
    writeDB({ books });
  },
  updateBookProgress: (id: string, progress: { savedIndex?: number, savedTime?: number, splitByCommas?: boolean }) => {
    const books = readDB().books;
    const target = books.find((b: any) => b.id === id);
    if (target) {
      if (progress.savedIndex !== undefined) target.savedIndex = progress.savedIndex;
      if (progress.savedTime !== undefined) target.savedTime = progress.savedTime;
      if (progress.splitByCommas !== undefined) target.splitByCommas = progress.splitByCommas;
      writeDB({ books });
    }
  },
  
  getDailyRecords: () => readDB().dailyRecords,
  updateDailyRecord: (payload: { date: string, record: any }) => {
    // Upsert exact record at date key mapping
    const records = readDB().dailyRecords;
    records[payload.date] = payload.record;
    writeDB({ dailyRecords: records });
  },
  
  // Analytics Exporters
  getUserData: () => {
    const db = readDB();
    return {
      dailyGoals: db.dailyGoals,
      miningHistory: db.miningHistory,
      lastGoalMetDate: db.lastGoalMetDate
    };
  },
  updateGoals: (goals: any) => {
    writeDB({ dailyGoals: { ...readDB().dailyGoals, ...goals } });
  },
  addMiningHistory: (entry: any) => {
    const history = readDB().miningHistory;
    const newHistory = [entry, ...history].slice(0, 200);
    writeDB({ miningHistory: newHistory });
  },
  updateLastGoalMetDate: (date: string) => {
    writeDB({ lastGoalMetDate: date });
  },
  
  // Bookmark Engines
  getBookmarks: () => readDB().bookmarks || [],
  addBookmark: (entry: any) => {
    const list = readDB().bookmarks || [];
    writeDB({ bookmarks: [entry, ...list] });
  },
  removeBookmark: (id: string) => {
    const list = readDB().bookmarks || [];
    writeDB({ bookmarks: list.filter((b: any) => b.id !== id) });
  },

  // Annotations
  getAnnotations: (bookId: string) => {
    const data = readDB();
    return data.annotations?.[bookId] || {};
  },
  saveAnnotation: (bookId: string, subtitleId: string, text: string) => {
    const data = readDB();
    const ann = data.annotations || {};
    if (!ann[bookId]) ann[bookId] = {};
    
    if (!text || text.trim() === '') {
      delete ann[bookId][subtitleId];
    } else {
      ann[bookId][subtitleId] = text;
    }
    writeDB({ annotations: ann });
  },

  // Active Timeline Target Search Queries
  getTimelineDates: () => {
    const rawData = readDB();
    const records = rawData.dailyRecords || {};
    const mining = rawData.miningHistory || [];
    
    // Structurally unify all explicit date references across parallel systems
    const allDates = new Set<string>();
    
    Object.keys(records).forEach(d => allDates.add(d));
    mining.forEach(m => {
      const d = new Date(m.timestamp);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      allDates.add(dateStr);
    });

    const sortedDates = Array.from(allDates).sort().reverse();

    // Map quantitative aggregated summaries natively into the date array payload
    return sortedDates.map(dateStr => {
      const dailyBooks = records[dateStr]?.books || {};
      const cardsToday = mining.filter(m => {
        const d = new Date(m.timestamp);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return ds === dateStr;
      });

      let dayTime = 0;
      let dayWords = 0;
      Object.keys(dailyBooks).forEach(bid => {
        dayTime += (dailyBooks[bid].timeReadSeconds || 0);
        dayWords += (dailyBooks[bid].wordsRead || 0);
      });

      return {
        date: dateStr,
        totalTimeSeconds: dayTime,
        totalWords: dayWords,
        cardsMined: cardsToday.length
      };
    });
  },

  getTimelineForDate: (dateStr: string) => {
    const rawData = readDB();
    const records = rawData.dailyRecords || {};
    const mining = rawData.miningHistory || [];
    const booksArr = rawData.books || [];

    const dailyBooks = records[dateStr]?.books || {};
    
    // Extract Anki cards generated purely matching this requested Search Target Date
    const cardsToday = mining.filter(m => {
       const d = new Date(m.timestamp);
       const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
       return ds === dateStr;
    });

    const booksInvolved = new Set<string>();
    Object.keys(dailyBooks).forEach(bid => booksInvolved.add(bid));
    cardsToday.forEach(m => {
       if (m.bookId) booksInvolved.add(m.bookId);
    });

    let dayTime = 0;
    let dayWords = 0;
    let dayChars = 0;
    let dayCards = cardsToday.length;

    const booksArray = Array.from(booksInvolved).map(bookId => {
      const stats = dailyBooks[bookId] || {};
      const minedHere = cardsToday.filter(m => m.bookId === bookId).length;
      
      dayTime += (stats.timeReadSeconds || 0);
      dayWords += (stats.wordsRead || 0);
      dayChars += (stats.charactersRead || 0);
      
      const b = booksArr.find((book: any) => book.id === bookId);
      
      return {
        bookId,
        bookTitle: b ? b.title : 'Unknown Book',
        timeReadSeconds: stats.timeReadSeconds || 0,
        wordsRead: stats.wordsRead || 0,
        charactersRead: stats.charactersRead || 0,
        cardsMined: minedHere
      };
    });

    return {
      date: dateStr,
      totalTimeSeconds: dayTime,
      totalWords: dayWords,
      totalCharacters: dayChars,
      cardsMined: dayCards,
      books: booksArray,
      minedCardEntries: cardsToday // Explicit native injection of vocabulary strings
    };
  }
};
