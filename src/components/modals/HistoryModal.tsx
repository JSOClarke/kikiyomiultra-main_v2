import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useStore } from '../../store/useStore';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<BaseModalProps> = ({ isOpen, onClose }) => {
  const history = useStore(state => state.miningHistory);
  const clearHistory = useStore(state => state.clearMiningHistory);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mining History">
      <div className="flex-1 overflow-y-auto mb-5 max-h-[60vh] border border-[#222] dark:border-white/10 rounded-xl p-3 bg-bg shadow-inner flex flex-col gap-2 relative">
        {history.length === 0 ? (
          <div className="text-text-muted text-center py-10 font-bold">No cards sent to Anki yet.</div>
        ) : (
          history.slice().reverse().map(entry => (
             <div key={entry.id} className="p-3 bg-surface border border-white/5 rounded-lg shadow-sm">
                <div className="text-sm font-bold text-text mb-1 leading-snug">{entry.text}</div>
                <div className="flex justify-between items-center text-xs text-text-muted mt-2">
                   <div className="truncate max-w-[60%]">{entry.bookTitle}</div>
                   <div className="font-mono bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded">{formatDate(entry.timestamp)}</div>
                </div>
             </div>
          ))
        )}
      </div>
      
      <div className="text-right flex justify-between">
        <Button 
          onClick={() => {
             if (window.confirm("Are you sure you want to clear your local Anki history records?")) {
               clearHistory();
             }
          }} 
          className="border-warn text-warn hover:bg-warn hover:text-black hover:border-transparent transition-colors"
        >
          Clear All
        </Button>
        <Button variant="primary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};
