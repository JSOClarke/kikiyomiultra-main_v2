import React from 'react';
import { BookListItem } from './BookListItem';
import { DropZone } from './DropZone';
import { usePlayerStore } from '../../store/usePlayerStore';

export const BookList: React.FC = () => {
  const library = usePlayerStore((state) => state.library);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 w-full">
      <DropZone />
      
      {library.map((book) => (
        <BookListItem key={book.id} book={book} />
      ))}
    </div>
  );
};
