import React from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { DashboardStats } from '../components/library/DashboardStats';
import { BookList } from '../components/library/BookList';
import { ActiveBookCard } from '../components/library/ActiveBookCard';
import { DailyGoalsTracker } from '../components/library/DailyGoalsTracker';
import { useStore } from '../store/useStore';

export const DashboardPage: React.FC = () => {
  const openModal = useStore(state => state.openModal);
  return (
    <PageContainer>
      <div className="flex justify-between items-end mb-8 mt-4 w-full px-1">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-text mb-2 tracking-tight">Welcome back.</h1>
          <p className="text-text-muted text-sm tracking-wide">Ready to continue your immersion?</p>
        </div>
      </div>

      <DailyGoalsTracker />

      <DashboardStats />

      <div className="mt-8 mb-6 w-full">
        <h2 className="text-lg font-bold text-text mb-4 px-1">Jump Back In</h2>
        <ActiveBookCard />
      </div>

      <div className="mt-8 mb-6 w-full flex flex-col flex-1">
        <div className="flex justify-between items-end mb-5 border-b border-black/5 dark:border-white/5 pb-3 px-1">
          <h2 className="text-lg font-bold text-text">Recent Books</h2>
          <span 
            className="text-xs font-bold text-text-muted uppercase tracking-wider cursor-pointer hover:text-primary transition-colors hover-scale-sm"
            onClick={() => openModal('isAllBooksOpen')}
          >
            View All
          </span>
        </div>
        <BookList />
      </div>

      <div className="mt-auto pt-8 text-text-muted text-xs font-mono opacity-50 pb-4 text-center w-full">
        v1.4.0 - Dashboard Edition
      </div>
    </PageContainer>
  );
}
