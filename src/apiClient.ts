import { Book, TimelineDay, TimelineDateSummary } from './types';

// Rely on Vite Server Proxy handling to map all traffic to the native Backend automatically
const API_BASE = '/api';

export const apiClient = {
  async getLibrary(): Promise<Book[]> {
    const res = await fetch(`${API_BASE}/books`);
    if (!res.ok) throw new Error('Failed to fetch library');
    return res.json();
  },

  async getBook(id: string): Promise<Book> {
    const res = await fetch(`${API_BASE}/books/${id}`);
    if (!res.ok) throw new Error('Failed to fetch book');
    return res.json();
  },

  async updateBookProgress(id: string, progress: { savedIndex?: number, savedTime?: number, splitByCommas?: boolean }): Promise<void> {
    const res = await fetch(`${API_BASE}/books/${id}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress)
    });
    if (!res.ok) console.warn('Failed to update book progress');
  },

  async saveBook(book: Partial<Book>): Promise<void> {
    const res = await fetch(`${API_BASE}/books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book)
    });
    if (!res.ok) throw new Error('Failed to save book');
  },

  async deleteBook(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/books/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete book');
  },

  // Annotations
  async getAnnotations(bookId: string): Promise<Record<string, string>> {
    const res = await fetch(`${API_BASE}/books/${bookId}/annotations`);
    if (!res.ok) throw new Error('Failed to fetch annotations');
    return res.json();
  },

  async saveAnnotation(bookId: string, subtitleId: string, text: string): Promise<void> {
    const res = await fetch(`${API_BASE}/books/${bookId}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtitleId, text })
    });
    if (!res.ok) console.warn('Failed to save annotation');
  },

  async uploadMedia(file: File): Promise<{ path: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload media');
    return res.json();
  },

  async uploadMangaFolder(files: File[], onProgress: (pct: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      files.forEach(f => {
        // webkitRelativePath contains the actual folder structure which Multer parses natively
        formData.append('files', f, f.webkitRelativePath || f.name);
      });

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/upload/manga/folder`, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.bookId);
        } else {
          reject(new Error(`Upload failed: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during Manga upload'));
      xhr.send(formData);
    });
  },

  // Daily Stats Engine
  async getDailyRecords(): Promise<Record<string, any>> {
    const res = await fetch(`${API_BASE}/sync/records`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async syncDailyRecord(record: any): Promise<void> {
    await fetch(`${API_BASE}/sync/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
  },

  // User Analytics Sync (Goals & Profile)
  async getUserData(): Promise<any> {
    const res = await fetch(`${API_BASE}/user`);
    if (!res.ok) throw new Error('Failed to fetch user data');
    return res.json();
  },
  async updateGoals(goals: any): Promise<void> {
    const res = await fetch(`${API_BASE}/user/goals`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goals)
    });
    if (!res.ok) console.warn('Failed to sync goals');
  },
  async addMiningHistory(entry: any): Promise<void> {
    const res = await fetch(`${API_BASE}/user/history`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (!res.ok) console.warn('Failed to sync mining history');
  },
  async updateLastGoalDate(date: string): Promise<void> {
    const res = await fetch(`${API_BASE}/user/last-goal-date`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });
    if (!res.ok) console.warn('Failed to sync goal date');
  },
  
  async getTimelineDates(): Promise<TimelineDateSummary[]> {
    const res = await fetch(`${API_BASE}/user/timeline/dates`);
    if (!res.ok) throw new Error('Failed to fetch timeline dates');
    return res.json();
  },

  async getTimelineForDate(date: string): Promise<TimelineDay> {
    const res = await fetch(`${API_BASE}/user/timeline/${date}`);
    if (!res.ok) throw new Error('Failed to fetch timeline for date');
    return res.json();
  },

  // Bookmarking Syncer
  async getBookmarks(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/user/bookmarks`);
    if (!res.ok) throw new Error('Failed to fetch bookmarks');
    return res.json();
  },
  async addBookmark(bookmark: any): Promise<void> {
    const res = await fetch(`${API_BASE}/user/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookmark)
    });
    if (!res.ok) console.warn('Failed to add bookmark');
  },
  async removeBookmark(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/user/bookmarks/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) console.warn('Failed to remove bookmark');
  }
};
