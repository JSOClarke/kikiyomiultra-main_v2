import React from 'react';
import { useStore } from '../../store/useStore';
import { Sidebar } from './Sidebar';
import { SettingsModal } from '../modals/SettingsModal';
import { BookmarksModal } from '../modals/BookmarksModal';
import { HistoryModal } from '../modals/HistoryModal';
import { HelpModal } from '../modals/HelpModal';
import { AllBooksModal } from '../modals/AllBooksModal';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    isSettingsOpen, isBookmarksOpen, isHistoryOpen, isHelpOpen, isAllBooksOpen,
    closeModal 
  } = useStore();

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-bg text-text font-ui relative">
      <Sidebar />
      
      <div className="flex-1 flex flex-col relative overflow-hidden bg-bg">
        {children}
      </div>
      
      {/* Global Modals container rendered within the main boundary */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => closeModal('isSettingsOpen')} />
      <BookmarksModal isOpen={isBookmarksOpen} onClose={() => closeModal('isBookmarksOpen')} />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => closeModal('isHistoryOpen')} />
      <HelpModal isOpen={isHelpOpen} onClose={() => closeModal('isHelpOpen')} />
      <AllBooksModal isOpen={isAllBooksOpen} onClose={() => closeModal('isAllBooksOpen')} />
    </div>
  );
}
