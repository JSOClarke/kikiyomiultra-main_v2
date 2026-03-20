import React, { useState } from 'react';
import { MangaPage } from '../../types';
import { MangaOcrOverlay } from './MangaOcrOverlay';
import { useStore } from '../../store/useStore';
import { Loader2 } from 'lucide-react';

interface MangaCanvasProps {
  page: MangaPage | undefined;
}

export const MangaCanvas: React.FC<MangaCanvasProps> = ({ page }) => {
  const mangaFitMode = useStore(state => state.mangaFitMode);
  
  const [naturalWidth, setNaturalWidth] = useState<number>(0);
  const [naturalHeight, setNaturalHeight] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Force loading spinner specifically when the target payload string changes
  React.useEffect(() => {
    setIsLoading(true);
  }, [page?.imageUrl]);

  if (!page) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
         <p>No valid manga structural data found.</p>
      </div>
    );
  }

  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    setNaturalWidth(target.naturalWidth);
    setNaturalHeight(target.naturalHeight);
    setIsLoading(false);
  };

  // Dynamically resolve CSS structural layouts based on mathematical fit constraints
  let outerContainerClass = "relative w-full min-h-full flex justify-center bg-black ";
  outerContainerClass += mangaFitMode === 'fit-screen' ? "items-center p-2 md:p-6" : "items-start pt-16 pb-4"; // Give header space for scrolling modes

  let wrapperClass = "relative shadow-[0_0_25px_rgba(0,0,0,0.8)] inline-flex ";
  wrapperClass += mangaFitMode === 'fit-screen' ? "max-w-full max-h-full" : (mangaFitMode === 'fit-width' ? "w-full sm:w-[90%] md:w-[80%]" : "");

  let imageClass = "block select-none transition-opacity duration-300 rounded-sm ";
  if (mangaFitMode === 'fit-screen') {
     imageClass += "max-w-full max-h-[90vh] md:max-h-[95vh] w-auto h-auto object-contain";
  } else if (mangaFitMode === 'fit-width') {
     imageClass += "w-full h-auto object-contain";
  } else {
     imageClass += "max-w-none w-auto h-auto";
  }

  return (
    <div className={outerContainerClass}>
       {/* Background structural loading wrapper isolating image popping */}
       {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50 backdrop-blur-sm">
             <Loader2 size={48} className="text-sec animate-spin opacity-80" />
          </div>
       )}

       {/* The Mathematical Scale Container */}
       <div className={wrapperClass}>
          <img 
            src={page.imageUrl} 
            onLoad={handleImageLoaded}
            // Keep object containment rigorous so CSS overlays bind physically zero-overflow
            className={imageClass}
            style={{ opacity: isLoading ? 0 : 1 }}
            alt="Manga Payload" 
          />
          
          {/* Inject Dynamic Coordinates mapping transparent layer if extraction engine successfully parsed data */}
          {!isLoading && page.ocrBlocks && page.ocrBlocks.length > 0 && (
            <MangaOcrOverlay 
               blocks={page.ocrBlocks} 
               naturalWidth={naturalWidth} 
               naturalHeight={naturalHeight} 
            />
          )}
       </div>
    </div>
  );
}
