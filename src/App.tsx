import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LibraryPage } from './pages/LibraryPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { PlayerPage } from './pages/PlayerPage';
import { Toaster } from 'react-hot-toast';
import { Tracker } from './components/player/Tracker';
import { apiClient } from './apiClient';
import { useStatsStore } from './store/useStatsStore';
import { usePlayerStore } from './store/usePlayerStore';
import { useStore } from './store/useStore';
import { Book } from './types';

const App: React.FC = () => {
  const theme = useStore((state) => state.theme);
  const readerFont = useStore((state) => state.readerFont);
  const readerFontSize = useStore((state) => state.readerFontSize);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--font-reader', readerFont);
    document.documentElement.style.setProperty('--font-size-base', `${readerFontSize}px`);
  }, [theme, readerFont, readerFontSize]);

  useEffect(() => {
    // Hydrate backend WebUI Database Models natively into Zustand Cache architecture
    apiClient.getLibrary().then(books => {
      usePlayerStore.setState({ library: books });
      // Hot-swap the active context to retain reading flow across sessions
      const currentActive = usePlayerStore.getState().activeBook;
      if (currentActive) {
        apiClient.getBook(currentActive.id)
          .then(fullBook => {
            // Must funnel through the actual Zustand action so the Comma-Splitting algorithm catches the payload
            usePlayerStore.getState().setActiveBook(fullBook);
          })
          .catch(() => {
            const synced = books.find(b => b.id === currentActive.id);
            if (synced) usePlayerStore.getState().setActiveBook(synced as Book);
          });
      }
    }).catch(e => console.warn("Backend unavailable, loading local IndexedDB fallback.", e));

    apiClient.getDailyRecords().then(records => {
      useStatsStore.setState({ dailyRecords: records });
    }).catch(console.warn);

    // Global User Analytics Profile Hydration
    apiClient.getUserData().then(data => {
      if (data.dailyGoals) useStore.setState({ dailyGoals: data.dailyGoals });
      if (data.miningHistory) useStore.setState({ miningHistory: data.miningHistory });
      if (data.lastGoalMetDate !== undefined) useStore.setState({ lastGoalMetDate: data.lastGoalMetDate });
    }).catch(console.warn);

    // Bootstrap Universal Bookmarks Vector
    apiClient.getBookmarks().then(marks => {
      if (marks && Array.isArray(marks)) useStore.setState({ bookmarks: marks });
    }).catch(console.warn);
  }, []);

  return (
    <BrowserRouter>
      <Tracker />
      <Toaster />
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/player/:bookId" element={<PlayerPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default App;
