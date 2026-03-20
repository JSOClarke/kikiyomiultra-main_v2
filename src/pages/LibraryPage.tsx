import React from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { BookList } from '../components/library/BookList';

export const LibraryPage: React.FC = () => {
  return (
    <PageContainer>
      <div className="flex justify-between items-end mb-8 mt-4 w-full px-1 border-b border-black/5 dark:border-white/5 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-text mb-2 tracking-tight">Your Library</h1>
          <p className="text-text-muted text-sm tracking-wide">Manage your collection of immersions.</p>
        </div>
      </div>

      <div className="w-full flex flex-col flex-1 mt-6">
        <BookList />
      </div>
    </PageContainer>
  );
}
