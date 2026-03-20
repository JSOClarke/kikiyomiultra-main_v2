import React from 'react';
import { useStore } from '../../store/useStore';
import { Settings2, X, Type, Search, Maximize } from 'lucide-react';

export const MangaSettingsModal: React.FC = () => {
  const isMangaSettingsOpen = useStore(state => state.isMangaSettingsOpen);
  const closeModal = useStore(state => state.closeModal);
  
  const mangaFontSize = useStore(state => state.mangaFontSize);
  const setMangaFontSize = useStore(state => state.setMangaFontSize);
  
  const mangaFontFamily = useStore(state => state.mangaFontFamily);
  const setMangaFontFamily = useStore(state => state.setMangaFontFamily);

  const mangaFitMode = useStore(state => state.mangaFitMode);
  const setMangaFitMode = useStore(state => state.setMangaFitMode);

  if (!isMangaSettingsOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={() => closeModal('isMangaSettingsOpen')}>
      <div 
         className="bg-surface border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
         onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-bg/50">
          <div className="flex items-center gap-2">
            <Settings2 size={18} className="text-sec" />
            <h2 className="font-bold text-text tracking-wide">Manga Preferences</h2>
          </div>
          <button onClick={() => closeModal('isMangaSettingsOpen')} className="text-text-muted hover:text-text transition-colors p-1 rounded-full hover:bg-white/5">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Font Size Binding Slider */}
          <div className="space-y-3">
             <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-text font-medium">
                  <Type size={16} className="text-sec" />
                  Dialogue Scale
                </div>
                <span className="text-primary font-mono bg-bg px-2 py-0.5 rounded text-xs border border-white/5">{mangaFontSize}px</span>
             </div>
             <input 
               type="range"
               min="8" max="72" step="1"
               value={mangaFontSize}
               onChange={(e) => setMangaFontSize(Number(e.target.value))}
               className="w-full accent-sec"
             />
             <p className="text-xs text-text-muted">Overrides the default Mokuro JSON font boundaries.</p>
          </div>

          {/* Layout Scale Binding */}
          <div className="space-y-3">
             <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-text font-medium">
                   <Maximize size={16} className="text-sec" />
                   Image Fit Mode
                </div>
             </div>
             <select 
               value={mangaFitMode}
               // @ts-ignore
               onChange={(e) => setMangaFitMode(e.target.value)}
               className="w-full bg-bg border border-white/10 rounded-lg p-2.5 text-sm text-text focus:border-sec focus:ring-1 focus:ring-sec outline-none cursor-pointer"
             >
                <option value="fit-screen">Fit to Screen (Default)</option>
                <option value="fit-width">Fit to Width (Scrollable)</option>
                <option value="original">Original Aspect Size</option>
             </select>
          </div>

          {/* Typeface Override Dropdown */}
          <div className="space-y-3">
             <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-text font-medium">
                   <Search size={16} className="text-sec" />
                   Typeface Engine
                </div>
             </div>
             <select 
               value={mangaFontFamily}
               onChange={(e) => setMangaFontFamily(e.target.value)}
               className="w-full bg-bg border border-white/10 rounded-lg p-2.5 text-sm text-text focus:border-sec focus:ring-1 focus:ring-sec outline-none cursor-pointer"
             >
                <option value="'Noto Sans JP', sans-serif">Noto Sans JP (Gothic)</option>
                <option value="'Noto Serif JP', serif">Noto Serif JP (Mincho)</option>
                <option value="'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif">Yu Gothic (JP)</option>
                <option value="system-ui, -apple-system, sans-serif">System Default OS</option>
                <option value="monospace">System Monospace</option>
             </select>
          </div>
        </div>
      </div>
    </div>
  );
}
