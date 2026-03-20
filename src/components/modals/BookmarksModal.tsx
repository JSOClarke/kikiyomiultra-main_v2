import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useStore } from '../../store/useStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { apiClient } from '../../apiClient';
import { Trash2, Play } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookmarksModal: React.FC<BaseModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  
  const bookmarks = useStore(state => state.bookmarks);
  const removeBookmark = useStore(state => state.removeBookmark);
  
  const activeBook = usePlayerStore(state => state.activeBook);
  
  const [filter, setFilter] = useState<'all' | 'current'>('all');

  const filteredBookmarks = bookmarks.filter(b => {
    if (filter === 'current' && activeBook) {
      return b.bookId === activeBook.id;
    }
    return true;
  });

  const handleJump = async (bookmark: any) => {
    // Navigate player to the book context first
    if (!activeBook || activeBook.id !== bookmark.bookId) {
       try {
         const fullBook = await apiClient.getBook(bookmark.bookId);
         usePlayerStore.getState().setActiveBook(fullBook);
       } catch (e) {
         console.error("Failed to load bookmark book context");
         return;
       }
    }
    // Set the specific sentence natively 
    const currentActiveBook = usePlayerStore.getState().activeBook;
    if (currentActiveBook && currentActiveBook.subtitles) {
       const targetIndex = currentActiveBook.subtitles.findIndex(s => s.id === bookmark.subtitleId);
       if (targetIndex > -1) {
          usePlayerStore.getState().setActiveIndex(targetIndex);
       }
    }
    onClose();
    navigate(`/player/${bookmark.bookId}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bookmarks" titleColor="var(--warn)">
      <div className="mb-4 border-b border-border pb-4">
        <select 
          className="w-full p-2 bg-bg border border-border text-text rounded outline-none"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="all">All Books</option>
          <option value="current">Current Book</option>
        </select>
      </div>
      
      <div className="overflow-y-auto m-0 flex-1 min-h-[200px] max-h-[60vh] flex flex-col gap-2">
        {filteredBookmarks.length === 0 ? (
          <div className="text-text-muted text-center py-8 hover:text-text cursor-default transition-colors duration-500">No bookmarks yet. Star a sentence while reading to manifest it here.</div>
        ) : (
          filteredBookmarks.map(b => (
             <div key={b.id} className="flex flex-col gap-2 p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors group">
                <div className="text-[1.2rem] font-reader text-text mb-1 leading-snug">{b.text}</div>
                <div className="flex justify-between items-center text-xs text-text-muted">
                  <span>{new Date(b.timestamp).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleJump(b)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/40 text-primary rounded-md transition-colors"
                    >
                      <Play size={12} /> Jump
                    </button>
                    <button 
                      onClick={() => removeBookmark(b.id)}
                      className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                      title="Delete Bookmark"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
             </div>
          ))
        )}
      </div>
      
      <div className="text-right mt-4 flex justify-between">
        <Button onClick={() => console.log('Exporting CSV...')}>Export CSV</Button>
        <Button variant="primary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};
