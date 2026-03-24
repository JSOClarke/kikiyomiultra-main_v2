import React, { useState } from 'react';
import { Star, Copy, Languages, Check, LibraryBig, MessageSquare } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useTranslate } from '../../hooks/useTranslate';
import { useAnki } from '../../hooks/useAnki';
import { Subtitle } from '../../types';
import { tokenizers } from '../../utils/tokenizers';

interface SubtitleRowProps {
  sub: Subtitle;
  isActive: boolean;
  index: number;
}

export const SubtitleRow: React.FC<SubtitleRowProps> = ({ sub, isActive, index }) => {
  const seekTo = usePlayerStore((state) => state.seekTo);
  const activeBook = usePlayerStore((state) => state.activeBook);
  const setActiveIndex = usePlayerStore((state) => state.setActiveIndex);
  const isVerticalMode = useStore((state) => state.isVerticalMode);
  
  const textContainerRef = React.useRef<HTMLDivElement>(null);

  // Translation Hook
  const { translation, isLoading, fetchTranslation } = useTranslate();
  const [showTranslation, setShowTranslation] = useState(false);
  
  // Anki Mining Hook
  const { enhanceCard, isEnhancing } = useAnki();
  const [ankiStatus, setAnkiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Hard-sync the wrapper's physical bounding box to its internal orthogonal scroll wrapper.
  // Because C++ layout engines fail to expand bounding boxes natively when vertical-rl text 
  // wraps across extra columns, we physically probe it and patch the style width before paint.
  // This guarantees TanStack Virtual perfectly separates the rows without overlapping them.
  React.useLayoutEffect(() => {
    if (isVerticalMode && textContainerRef.current) {
      // Disconnect artificial sizing temporarily to probe natural orthogonal block size
      textContainerRef.current.style.minWidth = 'auto';
      const actualWidth = textContainerRef.current.scrollWidth;
      if (actualWidth > 0) {
        textContainerRef.current.style.minWidth = `${actualWidth}px`;
      }
    } else if (textContainerRef.current) {
      textContainerRef.current.style.minWidth = 'auto';
    }
  }, [sub.text, isVerticalMode]);

  // Local Action States
  const bookmarks = useStore((state) => state.bookmarks);
  const addBookmark = useStore((state) => state.addBookmark);
  const removeBookmark = useStore((state) => state.removeBookmark);
  
  const activeBookmark = bookmarks.find(b => b.subtitleId === sub.id && b.bookId === activeBook?.id);
  const isBookmarked = !!activeBookmark;

  const [isCopied, setIsCopied] = useState(false);
  
  // Annotation Engine
  const activeAnnotations = useStore((state) => state.activeAnnotations);
  const showAnnotations = useStore((state) => state.showAnnotations);
  const setAnnotation = useStore((state) => state.setAnnotation);
  
  // Crucial: Strip dynamic comma split suffixes to isolate immutable identity
  const baseId = sub.id.split('_c')[0];
  const storedAnnotation = activeAnnotations[baseId] || '';
  
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationValue, setAnnotationValue] = useState(storedAnnotation);

  React.useEffect(() => {
    setAnnotationValue(storedAnnotation);
  }, [storedAnnotation]);

  const handleAnnotationToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsAnnotating(!isAnnotating);
  };
  
  const handleAnnotationBlur = () => {
    if (activeBook) {
      setAnnotation(activeBook.id, baseId, annotationValue);
    }
    setIsAnnotating(false);
  };
  
  const handleAnnotationKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.currentTarget.blur(); // Blur triggers the autosave
    } else if (e.key === 'Escape') {
      setIsAnnotating(false);
      setAnnotationValue(storedAnnotation); // Cancel explicit edits
    }
  };

  // Token Navigation
  const isTokenNavMode = usePlayerStore((state) => state.isTokenNavMode);
  const navTokens = usePlayerStore((state) => state.navTokens);
  const activeTokenIndex = usePlayerStore((state) => state.activeTokenIndex);
  const setNavTokens = usePlayerStore((state) => state.setNavTokens);
  const setActiveTokenIndex = usePlayerStore((state) => state.setActiveTokenIndex);

  React.useEffect(() => {
    if (isActive && isTokenNavMode) {
      const tokens = tokenizers.getTokenizer().tokenize(sub.text);
      setNavTokens(tokens);
    }
  }, [isActive, isTokenNavMode, sub.text, setNavTokens]);

  const handleClick = () => {
    setActiveIndex(index);
    if (activeBook?.type === 'audiobook') {
      seekTo(sub.startTime + 0.001);
    }
  };

  const handleTranslateClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    setShowTranslation(true);
    fetchTranslation(sub.text);
  };

  const handleCopyClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(sub.text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = sub.text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.warn("Clipboard access denied natively.", err);
    }
  };

  const handleAnkiMining = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      setAnkiStatus('idle'); // Reset
      await enhanceCard(index, sub.text);
      setAnkiStatus('success');
      setTimeout(() => setAnkiStatus('idle'), 2000);
    } catch (err) {
      console.warn("Anki Enhancement Failed", err);
      setAnkiStatus('error');
      setTimeout(() => setAnkiStatus('idle'), 3000);
    }
  };

  const handleBookmarkClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!activeBook) return;
    
    if (isBookmarked && activeBookmark) {
      removeBookmark(activeBookmark.id);
    } else {
      addBookmark({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
        bookId: activeBook.id,
        subtitleId: sub.id,
        text: sub.text,
        timestamp: Date.now()
      });
    }
  };

  return (
    <li
      data-sub-id={sub.id}
      onClick={handleClick}
      className={`relative flex items-center justify-center py-4 px-2 md:px-4 cursor-pointer text-[1.4rem] md:text-[1.8rem] font-reader leading-relaxed transition-colors duration-500 ease-out group rounded-2xl
        ${isVerticalMode 
           ? 'flex-col h-full min-w-[3em] mx-1 md:mx-4 my-0 pt-[40px]' 
           : 'w-full min-h-[3em] my-2 pt-[30px]'
        }
        ${isActive 
          ? 'bg-white/5 text-text font-medium z-10 shadow-sm' 
          : 'text-text-muted hover:text-text hover:bg-white/5'
        }
      `}
    >

      {/* Unified Action Floating Bar */}
      <div 
        className={`absolute z-20 flex flex-row items-center gap-1.5 w-max px-3 py-1.5 bg-surface-hover/90 backdrop-blur-md rounded-full shadow-md transition-all duration-300
          ${isVerticalMode ? 'top-0 left-1/2 -translate-x-1/2' : 'top-2 right-4'}
          ${isActive ? 'opacity-100 scale-100 pointer-events-auto md:opacity-0 md:scale-95 md:pointer-events-none md:group-hover:opacity-100 md:group-hover:scale-100 md:group-hover:pointer-events-auto' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto'}
        `}
      >
        <button 
          className={`bg-transparent border-none cursor-pointer transition-all p-1.5 rounded-full hover:bg-white/20 ${isBookmarked ? 'text-warn scale-110' : 'text-text-muted opacity-70 hover:text-warn hover:opacity-100 hover:scale-110'}`} 
          onClick={handleBookmarkClick} title="Bookmark this line"
        >
          <Star size={16} fill={isBookmarked ? "currentColor" : "none"} />
        </button>
        <button 
          className={`bg-transparent border-none cursor-pointer transition-all p-1.5 rounded-full hover:bg-white/20 ${isCopied ? 'text-sec scale-110' : 'text-text-muted opacity-70 hover:text-sec hover:opacity-100 hover:scale-110'}`} 
          onClick={handleCopyClick} title="Copy Japanese Text"
        >
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
        </button>
        <div className="w-px h-4 bg-white/10 mx-1"></div>
        <button 
          className={`bg-transparent border-none cursor-pointer transition-all p-1.5 rounded-full hover:bg-white/20 ${isEnhancing[sub.id] ? 'animate-pulse text-yellow-400 scale-110' : ankiStatus === 'success' ? 'text-green-500 scale-110' : ankiStatus === 'error' ? 'text-red-500 scale-110' : sub.isMined ? 'text-green-500 hover:scale-110' : 'text-text-muted opacity-70 hover:text-sec hover:opacity-100 hover:scale-110'}`} 
          onClick={handleAnkiMining} title={sub.isMined ? "Sent to Anki" : "Send to Anki"} disabled={isEnhancing[sub.id]}
        >
           {ankiStatus === 'success' || sub.isMined ? <Check size={16} /> : <LibraryBig size={16} />}
        </button>
        <button 
          className={`bg-transparent border-none cursor-pointer transition-all p-1.5 rounded-full hover:bg-white/20 ${showTranslation ? 'text-primary scale-110' : 'text-text-muted opacity-70 hover:text-primary hover:opacity-100 hover:scale-110'} ${isLoading ? 'animate-pulse' : ''}`} 
          onClick={handleTranslateClick} title="Translate Line"
        >
          <Languages size={16} />
        </button>
        <button 
          className={`bg-transparent border-none cursor-pointer transition-all p-1.5 rounded-full hover:bg-white/20 ${isAnnotating || annotationValue ? 'text-blue-400 scale-110' : 'text-text-muted opacity-70 hover:text-blue-400 hover:opacity-100 hover:scale-110'}`} 
          onClick={handleAnnotationToggle} title={annotationValue ? "Edit Annotation" : "Add Annotation"}
        >
           <MessageSquare size={16} fill={annotationValue ? "currentColor" : "none"} />
        </button>
      </div>

      <div className={`flex-1 z-10 flex ${isVerticalMode ? 'text-left flex-row items-start justify-start h-full max-h-full min-h-0' : 'text-center flex-col items-center w-full'} gap-2 px-2`}>
        <div 
          ref={textContainerRef}
          dir="ltr"
          className={`transition-colors font-medium whitespace-pre-wrap text-[length:var(--font-size-base)] leading-normal tracking-normal h-full max-h-full min-h-0 ${isTokenNavMode ? 'select-none cursor-pointer' : 'select-text cursor-text'}`}
          style={isVerticalMode ? { writingMode: 'vertical-rl', WebkitWritingMode: 'vertical-rl', textAlign: 'left' } : { textAlign: 'center' }}
        >
          {isActive && isTokenNavMode ? (
            navTokens.map((token) => (
              <span
                key={token.index}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTokenIndex(token.index);
                }}
                className={`rounded-[3px] transition-colors duration-100 ${
                  token.isWordLike ? 'cursor-pointer hover:bg-white/10' : ''
                } ${!token.isWordLike && token.text.trim() === '' ? 'pointer-events-none' : ''} ${
                  activeTokenIndex === token.index && token.isWordLike
                    ? 'bg-primary text-bg shadow-sm'
                    : ''
                }`}
              >
                {token.text}
              </span>
            ))
          ) : (
            sub.text
          )}
        </div>
        
        {/* On-Demand Translation Container */}
        <div className={`overflow-hidden transition-all duration-500 ${
          showTranslation 
            ? isVerticalMode ? 'max-w-[250px] opacity-100 pl-4' : 'max-h-[150px] opacity-100 mt-2' 
            : isVerticalMode ? 'max-w-0 opacity-0 px-0' : 'max-h-0 opacity-0'
        }`}>
          {isLoading ? (
            <div className="flex justify-center items-center py-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="text-sm md:text-base text-primary/80 font-sans tracking-wide pb-1">
              {translation}
            </div>
          )}
        </div>
        
        {/* Annotation Textarea Container */}
        <div className={`overflow-hidden transition-all duration-300 w-full ${isAnnotating || (annotationValue && showAnnotations) ? 'mt-3 opacity-100' : 'max-h-0 opacity-0'} ${isVerticalMode ? 'hidden' : ''}`}>
          {isAnnotating ? (
             <textarea 
               autoFocus
               value={annotationValue}
               onChange={(e) => setAnnotationValue(e.target.value)}
               onBlur={handleAnnotationBlur}
               onKeyDown={handleAnnotationKeyDown}
               onClick={(e) => e.stopPropagation()}
               placeholder="Add your notes here... (Ctrl+Enter to save)"
               className="w-full bg-black/20 dark:bg-white/5 text-text border border-primary/30 rounded-xl p-3 text-sm font-sans resize-none focus:outline-none focus:border-primary shadow-inner min-h-[5rem]"
             />
          ) : annotationValue && showAnnotations ? (
             <div 
               onClick={(e) => { e.stopPropagation(); setIsAnnotating(true); }}
               className="w-full bg-surface-hover/40 text-text border border-black/5 dark:border-white/5 rounded-xl p-3 text-sm font-sans cursor-pointer hover:bg-surface-hover/80 transition-colors text-left"
             >
               <div className="flex items-center gap-1.5 mb-1.5 opacity-70">
                 <MessageSquare size={12} className="text-blue-400" />
                 <span className="text-[0.65rem] uppercase tracking-widest font-bold">Notes</span>
               </div>
               <div className="leading-relaxed whitespace-pre-wrap">{annotationValue}</div>
             </div>
          ) : null}
        </div>
      </div>

    </li>
  );
}
