import React from 'react';
import { Modal } from '../ui/Modal';
import { usePlayerStore } from '../../store/usePlayerStore';
import { BookListItem } from '../library/BookListItem';

interface AllBooksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AllBooksModal: React.FC<AllBooksModalProps> = ({ isOpen, onClose }) => {
  const library = usePlayerStore(state => state.library);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="All Books" maxWidth="max-w-4xl">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-4 max-h-[70vh] overflow-y-auto p-1 py-4">
        {library.map((book) => (
          <BookListItem key={book.id} book={book} />
        ))}
        {library.length === 0 && (
          <div className="col-span-full py-8 text-center text-text-muted">
            Your library is currently empty.
          </div>
        )}
      </div>
    </Modal>
  );
};
