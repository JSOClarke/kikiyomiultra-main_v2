import React from 'react';

const MOCK_CHAPTERS = [
  { id: 1, time: '00:00', title: 'Chapter 1' },
  { id: 2, time: '14:20', title: 'Chapter 2' },
  { id: 3, time: '30:45', title: 'Chapter 3' },
];

export const ChapterSidebar: React.FC = () => {
  return (
    <div className="absolute top-0 bottom-0 right-0 w-[320px] bg-surface border-l border-border overflow-y-auto z-[60] shadow-[-5px_0_15px_rgba(0,0,0,0.5)]">
      {MOCK_CHAPTERS.map((chap, idx) => {
        const isActive = idx === 1; // mock active state
        
        return (
          <div
            key={chap.id}
            className={`px-3 py-1.5 border-b border-border text-[0.85rem] cursor-pointer flex items-center transition-colors duration-200
              ${isActive 
                ? 'bg-primary text-bg font-bold' 
                : 'text-text-muted bg-transparent hover:bg-surface-hover hover:text-text'}`}
          >
            <span
              className={`text-[0.75rem] mr-2.5 font-mono min-w-[45px] text-right
                ${isActive ? 'text-bg' : 'text-text-muted'}`}
            >
              {chap.time}
            </span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {chap.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}
