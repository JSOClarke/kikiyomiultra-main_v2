import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SubtitleRow } from './SubtitleRow';
import { usePlayerStore } from '../../store/usePlayerStore';

const EMPTY_SUBTITLES: any[] = [];

export const SubtitleList: React.FC = () => {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  const subtitles = usePlayerStore((state) => state.activeBook?.subtitles || EMPTY_SUBTITLES);
  const activeIndex = usePlayerStore((state) => state.activeIndex);
  
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Initialize the Virtualizer for ultra-fast rendering of tens of thousands of lines
  const virtualizer = useVirtualizer({
    count: subtitles.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 100, // Very rough average height of a subtitle row in px
    overscan: 5, // Pre-render 5 items above and below the viewport to prevent flash
    paddingStart: typeof window !== 'undefined' ? window.innerHeight * 0.4 : 400,
    paddingEnd: typeof window !== 'undefined' ? window.innerHeight * 0.4 : 400,
  });

  // Track if user is manually scrolling via wheel or touch (ignores programmatic scroll)
  const handleUserScroll = useCallback(() => {
    setUserHasScrolled(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setUserHasScrolled(false);
    }, 4000); // Wait 4 seconds after last interaction to resume auto-scroll
  }, []);

  // Native wheel interceptor (requires passive: false to cancel structural scroll jitter)
  useEffect(() => {
    const el = scrollElementRef.current;
    if (!el) return;

    let wheelDebounce = false;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // Annihilate native scroll velocity fighting

      if (wheelDebounce) return;
      wheelDebounce = true;
      setTimeout(() => wheelDebounce = false, 150); // 150ms legacy debounce logic

      if (e.deltaY > 0) {
        usePlayerStore.getState().skipToNextSubtitle();
      } else if (e.deltaY < 0) {
        usePlayerStore.getState().skipToPreviousSubtitle();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    // Rely strictly on unified activeIndex from the store rather than manual time calculations
    if (subtitles.length > 0 && activeIndex >= 0 && activeIndex < subtitles.length) {
      const active = subtitles[activeIndex];
      
      if (active.id !== activeSubId) {
        setActiveSubId(active.id);
      }
      
      // Auto-scroll to the active element, ONLY if the user isn't currently dragging the scrollbar
      if (!userHasScrolled && virtualizer) {
        // Wait till next tick to ensure Virtualizer is ready
        setTimeout(() => {
          virtualizer.scrollToIndex(activeIndex, {
            align: 'center',
            behavior: 'smooth'
          });
        }, 50);
      }
    }
  }, [activeIndex, subtitles, virtualizer, userHasScrolled]);

  return (
    <div 
      ref={scrollElementRef}
      onTouchMove={handleUserScroll}
      className="flex-1 overflow-y-auto relative w-full"
    >
      <div
        className="m-0 list-none bg-transparent w-full relative"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {/* We use absolutely positioned dynamic containers instead of a standard map */}
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const sub = subtitles[virtualRow.index];
          if (!sub) return null;
          
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <SubtitleRow 
                sub={sub} 
                isActive={sub.id === activeSubId} 
                index={virtualRow.index}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
