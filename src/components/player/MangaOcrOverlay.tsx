import React from 'react';
import { useStore } from '../../store/useStore';

interface MangaOcrOverlayProps {
  blocks: any[];
  naturalWidth: number;
  naturalHeight: number;
}

export const MangaOcrOverlay: React.FC<MangaOcrOverlayProps> = ({ blocks, naturalWidth, naturalHeight }) => {
  const mangaFontSize = useStore(state => state.mangaFontSize);
  const mangaFontFamily = useStore(state => state.mangaFontFamily);

  if (!naturalWidth || !naturalHeight || !blocks || blocks.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {blocks.map((b, i) => {
        const [x_min, y_min, x_max, y_max] = b.box;
        
        // Mathematically project raw OCR coordinates onto a fluid CSS percentage map!
        const left = (x_min / naturalWidth) * 100;
        const top = (y_min / naturalHeight) * 100;
        const width = ((x_max - x_min) / naturalWidth) * 100;
        const height = ((y_max - y_min) / naturalHeight) * 100;
        
        // Remove the destructive .join('') logic that ruins manga panel tracking
        const isVertical = b.vertical !== undefined ? b.vertical : ((y_max - y_min) > (x_max - x_min));
        
        return (
          <div 
             key={i} 
             // group hover triggers the child opacity natively without JS
             className="absolute cursor-text group z-10" 
             style={{ 
               left: `${left}%`, 
               top: `${top}%`, 
               width: `${width}%`, 
               height: `${height}%`,
             }}
          >
             {/* The exact Mokuro White Box UI Implementation */}
             {/* Note: .pageContainer:hover .textBox -> border: 2px solid rgba(237, 28, 36, 0.5) */}
             <div className="w-full h-full pointer-events-auto border-[2px] border-transparent hover:border-[#ed1c2480] hover:bg-white hover:z-[999] transition-none absolute inset-0">
                 <p 
                   className="text-black font-semibold select-text w-full h-full opacity-0 group-hover:opacity-100 m-0"
                   style={{
                     writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
                     fontSize: `${mangaFontSize}px`,
                     fontFamily: mangaFontFamily,
                     lineHeight: '1.1em',
                     letterSpacing: '0.1em'
                   }}
                 >
                   {b.lines.map((line: string, idx: number) => (
                     <React.Fragment key={idx}>
                       {line}
                       {idx < b.lines.length - 1 && <br />}
                     </React.Fragment>
                   ))}
                 </p>
             </div>
          </div>
        );
      })}
    </div>
  );
};
