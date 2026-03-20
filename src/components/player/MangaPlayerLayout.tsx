import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MangaBook } from '../../types';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useStore } from '../../store/useStore';
import { MangaCanvas } from './MangaCanvas';
import { MangaSettingsModal } from './MangaSettingsModal';
import { Menu, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Settings, X } from 'lucide-react';

interface MangaPlayerLayoutProps {
  book: MangaBook;
}

export const MangaPlayerLayout: React.FC<MangaPlayerLayoutProps> = ({ book }) => {
  const navigate = useNavigate();
  const activeIndex = usePlayerStore(state => state.activeIndex);
  const setActiveIndex = usePlayerStore(state => state.setActiveIndex);
  const openModal = useStore(state => state.openModal);
  
  const [isMenuHidden, setIsMenuHidden] = useState(false);
  const [pageInput, setPageInput] = useState((activeIndex + 1).toString());

  // Fallback defaults
  const pages = book.mangaPages || [];
  const currentPage = pages[activeIndex];
  const totalPages = pages.length;

  useEffect(() => {
    setPageInput((activeIndex + 1).toString());
  }, [activeIndex]);

  const handleNextPage = () => {
    if (activeIndex < totalPages - 1) setActiveIndex(activeIndex + 1);
  };

  const handlePrevPage = () => {
    if (activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const handleFirstPage = () => {
    setActiveIndex(0);
  };

  const handleLastPage = () => {
    if (totalPages > 0) setActiveIndex(totalPages - 1);
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputBlur = () => {
    let newPage = parseInt(pageInput, 10);
    if (!isNaN(newPage)) {
      if (newPage < 1) newPage = 1;
      if (newPage > totalPages) newPage = totalPages;
      setActiveIndex(newPage - 1);
      setPageInput(newPage.toString());
    } else {
      setPageInput((activeIndex + 1).toString());
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePageInputBlur();
      e.currentTarget.blur();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#071013] flex flex-col z-[100] animate-in fade-in duration-300 overflow-hidden">
      
      {/* Collapsed State Restorer (Displays gracefully when hidden) */}
      {isMenuHidden && (
        <button 
          onMouseEnter={() => setIsMenuHidden(false)}
          onClick={() => setIsMenuHidden(false)}
          className="fixed top-4 left-4 z-[1000] w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all duration-300 hover:bg-black/60 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] group"
        >
          <Menu size={20} className="group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* Glassmorphic Kikiyomi Control Panel (Mokuro Mechanics) */}
      <div 
        className={`fixed top-4 left-4 z-[1000] bg-black/70 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl transition-all duration-300 flex items-center p-1.5 origin-top-left ${
          isMenuHidden ? 'scale-90 opacity-0 pointer-events-none' : 'scale-100 opacity-100 pointer-events-auto'
        }`}
      >
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-transparent text-white/70 hover:bg-red-500/20 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 mr-1"
          title="Return to Dashboard"
        >
          <X size={20} />
        </button>

        <button 
          onClick={() => setIsMenuHidden(true)}
          className="w-10 h-10 rounded-full bg-transparent text-white/70 hover:bg-sec hover:text-bg flex items-center justify-center transition-colors shrink-0"
          title="Minimize Menu"
        >
          <Menu size={18} />
        </button>

        <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

        <button 
          onClick={handleFirstPage}
          className="w-10 h-10 rounded-full bg-transparent text-white/70 hover:bg-sec hover:text-bg flex items-center justify-center transition-colors shrink-0"
        >
          <ChevronsLeft size={20} />
        </button>

        <button 
          onClick={handlePrevPage}
          className="w-10 h-10 rounded-full bg-transparent text-white/70 hover:bg-sec hover:text-bg flex items-center justify-center transition-colors shrink-0"
        >
          <ChevronLeft size={20} />
        </button>

        <button 
          onClick={handleNextPage}
          className="w-10 h-10 rounded-full bg-transparent text-white/70 hover:bg-sec hover:text-bg flex items-center justify-center transition-colors shrink-0"
        >
          <ChevronRight size={20} />
        </button>

        <button 
          onClick={handleLastPage}
          className="w-10 h-10 rounded-full bg-transparent text-white/70 hover:bg-sec hover:text-bg flex items-center justify-center transition-colors shrink-0"
        >
          <ChevronsRight size={20} />
        </button>

        <div className="flex items-center px-3 shrink-0">
          <input 
            type="number" 
            min="1" 
            max={totalPages} 
            value={pageInput}
            onChange={handlePageInputChange}
            onBlur={handlePageInputBlur}
            onKeyDown={handlePageInputKeyDown}
            className="w-12 h-7 mx-1 bg-white/10 focus:bg-white/20 border border-transparent focus:border-sec rounded text-center text-sm hide-arrows font-mono text-white outline-none transition-colors"
          />
          <span className="text-white/50 text-sm font-mono px-1">/ {totalPages}</span>
        </div>

        <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

        <button 
          onClick={() => openModal('isMangaSettingsOpen')}
          className="w-10 h-10 rounded-full bg-transparent text-white/70 hover:bg-sec hover:text-bg flex items-center justify-center transition-colors shrink-0"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Mokuro leftAScreen / rightAScreen Turn Zones */}
      <div 
        className="fixed top-[10vh] left-0 w-[15vw] h-[80vh] z-10 cursor-pointer"
        onClick={handlePrevPage} // Left side clicks go previous
      />
      <div 
        className="fixed top-[10vh] right-0 w-[15vw] h-[80vh] z-10 cursor-pointer"
        onClick={handleNextPage} // Right side clicks go next
      />

      {/* Main Container - The Mokuro pagesContainer equivalent */}
      <div className="flex-1 w-full h-full relative overflow-y-auto overflow-x-hidden pt-8">
         <MangaCanvas page={currentPage} />
      </div>

      {/* Global Modals */}
      <MangaSettingsModal />

    </div>
  );
};
