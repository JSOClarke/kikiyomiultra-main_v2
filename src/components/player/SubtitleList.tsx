import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SubtitleRow } from './SubtitleRow';
import { usePlayerStore } from '../../store/usePlayerStore';

const EMPTY_SUBTITLES: any[] = [];

export const SubtitleList: React.FC = () => {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  const subtitles = usePlayerStore((state) => state.activeBook?.subtitles || EMPTY_SUBTITLES);
  const activeIndex = usePlayerStore((state) => state.activeIndex);
  const isVerticalMode = useStore((state) => state.isVerticalMode);
  
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Initialize the Virtualizer for ultra-fast rendering of tens of thousands of lines
  const virtualizer = useVirtualizer({
    count: subtitles.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => isVerticalMode ? 80 : 100, // Vertical mode items are narrower (~80px wide) compared to horizontal mode (~100px tall)
    overscan: 5,
    paddingStart: typeof window !== 'undefined' ? ((isVerticalMode ? window.innerWidth : window.innerHeight) * 0.4) : 400,
    paddingEnd: typeof window !== 'undefined' ? ((isVerticalMode ? window.innerWidth : window.innerHeight) * 0.4) : 400,
    horizontal: isVerticalMode,
    isRtl: isVerticalMode,
    measureElement: (element) => {
      // Browser C++ layout engines natively fail to report bounding-box width accurately 
      // when orthogonal writingMode (vertical-rl) splits into multiple columns. 
      // We bypass this entirely by forcefully probing the unclipped scroll matrix.
      if (isVerticalMode) {
        return Math.max(element.getBoundingClientRect().width, element.scrollWidth);
      }
      return element.getBoundingClientRect().height;
    },
    scrollToFn: (offset, options) => {
      const el = scrollElementRef.current;
      if (!el) return;
      if (isVerticalMode) {
        // Modern browsers expect negative tracking for RTL matrices
        el.scrollTo({ left: -offset, behavior: options.behavior });
      } else {
        el.scrollTo({ top: offset, behavior: options.behavior });
      }
    }
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

      if (e.deltaY > 0 || e.deltaX < 0) { // Support horizontal trackpad scrolls
        usePlayerStore.getState().skipToNextSubtitle();
      } else if (e.deltaY < 0 || e.deltaX > 0) {
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
      if (!userHasScrolled && virtualizer && scrollElementRef.current) {
        // Wait till next tick to ensure Virtualizer is ready
        setTimeout(() => {
          virtualizer.scrollToIndex(activeIndex, {
            align: 'center',
            behavior: 'smooth'
          });
        }, 50);
      }
    }
  }, [activeIndex, subtitles, virtualizer, userHasScrolled, isVerticalMode]);

  return (
    <div 
      ref={scrollElementRef}
      dir={isVerticalMode ? "rtl" : "ltr"}
      onTouchMove={handleUserScroll}
      className={`flex-1 relative w-full h-full pb-32 ${isVerticalMode ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto overflow-x-hidden'}`}
    >
      <div
        className="m-0 list-none bg-transparent relative"
        style={{
          width: isVerticalMode ? `${virtualizer.getTotalSize()}px` : '100%',
          height: isVerticalMode ? '100%' : `${virtualizer.getTotalSize()}px`,
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
              className={`absolute top-0 ${isVerticalMode ? 'right-0' : 'left-0'}`}
              style={{
                width: isVerticalMode ? 'auto' : '100%',
                height: isVerticalMode ? '100%' : 'auto',
                transform: isVerticalMode ? `translateX(${-virtualRow.start}px)` : `translateY(${virtualRow.start}px)`,
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
