export interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  translation?: string;
  isRead?: boolean;
  isMined?: boolean;
}

export interface MangaPage {
  imageUrl: string;
  ocrBlocks?: any[]; // The raw JSON blocks extracted from Mokuro
}

export type BookType = 'audiobook' | 'epub' | 'manga';

export interface BaseBook {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  coverBlob?: Blob;
  savedIndex?: number;
  savedTime?: number;
  subtitles?: Subtitle[];
  originalSubtitles?: Subtitle[];
  mangaPages?: MangaPage[];
  splitByCommas?: boolean;
  totalSubtitles?: number; // Injected by the API Manifest
  language?: string;
  chapters?: { id?: string | number; title: string; subtitleIndex?: number; startTime?: number; }[];
}

export interface AudioBook extends BaseBook {
  type: 'audiobook';
  duration: number;
  audioUrl: string;
  audioBlob?: Blob;
}

export interface EpubBook extends BaseBook {
  type: 'epub';
  duration?: number; // Might not exist for raw text
  audioUrl?: never; // Explicitly enforce no audio URL
}

export interface MangaBook extends BaseBook {
  type: 'manga';
  duration?: never;
  audioUrl?: never;
}

export type Book = AudioBook | EpubBook | MangaBook;

export interface MiningHistoryEntry {
  id: string;
  bookId: string;
  text: string;
  bookTitle: string;
  timestamp: number;
}

export interface TimelineDateSummary {
  date: string;
  totalTimeSeconds: number;
  totalWords: number;
  cardsMined: number;
}

export interface TimelineDay {
  date: string;
  totalTimeSeconds: number;
  totalWords: number;
  totalCharacters: number;
  cardsMined: number;
  books: {
    bookId: string;
    bookTitle: string;
    timeReadSeconds: number;
    wordsRead: number;
    charactersRead: number;
    cardsMined: number;
  }[];
  minedCardEntries?: any[]; // Raw Anki Vocabulary mappings
}

export interface TimelineResponse {
  data: TimelineDay[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface DailyBookStats {
  timeReadSeconds: number;
  charactersRead: number;
  wordsRead: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  books: Record<string, DailyBookStats>;
}

export interface Bookmark {
  id: string;
  bookId: string;
  subtitleId: string;
  text: string;
  timestamp: number;
}
