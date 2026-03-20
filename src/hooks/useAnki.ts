import { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { AnkiConnect } from '../utils/AnkiConnect';
import { AudioUtils } from '../utils/audio';
import toast from 'react-hot-toast';

export const useAnki = () => {
  const [isEnhancing, setIsEnhancing] = useState<Record<string, boolean>>({});
  
  // Settings
  const ankiField = useStore((state) => state.ankiField);
  const ankiPictureField = useStore((state) => state.ankiPictureField);
  const ankiAddCover = useStore((state) => state.ankiAddCover);
  const ankiAddTag = useStore((state) => state.ankiAddTag);
  const addMiningHistory = useStore((state) => state.addMiningHistory);
  
  // Player Data
  const activeBook = usePlayerStore((state) => state.activeBook);
  const markSubtitleMined = usePlayerStore((state) => state.markSubtitleMined);
  
  const enhanceCard = useCallback(async (subtitleIndex: number, text: string) => {
    // Basic validation
    if (!activeBook || !activeBook.subtitles || !activeBook.subtitles[subtitleIndex]) {
       console.error("No valid subtitle provided for Anki enhancement.");
       return false;
    }

    const sub = activeBook.subtitles[subtitleIndex];
    setIsEnhancing(prev => ({ ...prev, [sub.id]: true }));

    try {
      // 1. Get the latest card created in Anki
      const cardId = await AnkiConnect.getLastCreatedCardId();
      if (!cardId) {
         throw new Error("No recently created card found in Anki. Please create a card first.");
      }

      // 2. Determine Audio Source. (TTS vs existing Media file)
      // Since kikiyomiultra currently might just rely on audiobook local files, we check if the activeBook has original audio.
      // E.g. If activeBook.type === 'audiobook' we should extract it.
      // Note: We need the actual File/Blob reference. 
      // If we don't have it in store yet, we might have to use audioRef or save the blob.
      
      // FOR NOW, to maintain backward compatibility with legacy index.html logic:
      // Let's assume we have `activeBook.audioFile` saved to the Book object when imported.
      // If it doesn't exist, we fallback to Google TTS URL.
      let sourceData: string;
      let isUrl = false;
      let ext = 'mp3';

      if (activeBook.type === 'audiobook' && activeBook.audioUrl) {
         try {
            // Try to fetch the blob. This works perfectly for local 'blob:' URLs 
            // but might fail with CORS for remote URLs unless they allow it.
            const response = await fetch(activeBook.audioUrl);
            if (!response.ok) throw new Error("Failed to fetch audio content");
            const blob = await response.blob();
            
            const snippet = await AudioUtils.getAudioSnippetBase64(blob, sub.startTime, sub.endTime || (sub.startTime + 5.0));
            sourceData = snippet.base64;
            isUrl = false;
            ext = snippet.ext;
         } catch (fetchErr) {
            console.warn("Could not slice audiobook audio (likely CORS issue with remote URL). Falling back to TTS.", fetchErr);
            const tl = activeBook.language || 'ja';
            sourceData = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${tl}&client=tw-ob`;
            isUrl = true;
         }
      } else {
         // Fallback to TTS (Google Translate)
         const tl = activeBook.language || 'ja';
         sourceData = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${tl}&client=tw-ob`;
         isUrl = true;
      }

      const filename = `kikiyomi_audio_${Date.now()}.${ext}`;

      // 3. Attach Audio
      const fieldUsed = await AnkiConnect.addAudioToCard(cardId, sourceData, filename, ankiField, isUrl);

      if (!fieldUsed) {
         throw new Error("Failed to attach audio to Anki note. Check your field mappings.");
      }

      // 4. Attach Cover Art (if enabled)
      if (ankiAddCover && (activeBook.coverBlob || activeBook.coverUrl)) {
          try {
             let base64Cover: string | undefined;

             if (activeBook.coverBlob) {
                // Convert pure blob to base64
                base64Cover = await new Promise((resolve, reject) => {
                   const reader = new FileReader();
                   reader.readAsDataURL(activeBook.coverBlob!);
                   reader.onloadend = () => {
                      const res = reader.result as string;
                      resolve(res.split(',')[1]);
                   };
                   reader.onerror = reject;
                });
             } else if (activeBook.coverUrl) {
                // Handle data:, blob:, or remote URLs dynamically
                if (activeBook.coverUrl.startsWith('data:image')) {
                   base64Cover = activeBook.coverUrl.split('base64,')[1];
                } else {
                   const res = await fetch(activeBook.coverUrl);
                   const blob = await res.blob();
                   base64Cover = await new Promise((resolve, reject) => {
                       const reader = new FileReader();
                       reader.readAsDataURL(blob);
                       reader.onloadend = () => {
                          const result = reader.result as string;
                          resolve(result.split(',')[1]);
                       };
                       reader.onerror = reject;
                   });
                }
             }

             if (base64Cover) {
                await AnkiConnect.addCoverToCard(cardId, base64Cover, null, ankiPictureField);
             }
          } catch (e) {
             console.warn("Cover attachment failed.", e);
          }
      }

      // 5. Attach Title Tag (if enabled)
      if (ankiAddTag && activeBook.title) {
          try {
             const cleanTag = activeBook.title.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf-]/g, '');
             if (cleanTag) {
                 await AnkiConnect.addTagsToCard(cardId, cleanTag);
             }
          } catch (e) {
             console.warn("Tag attachment failed.", e);
          }
      }

      markSubtitleMined(sub.id);
      addMiningHistory({
         text: sub.text,
         bookId: activeBook.id,
         bookTitle: activeBook.title || 'Unknown Book',
      });

      toast.success('Card sent to Anki!', {
         position: 'bottom-center',
         duration: 3000,
      });
      return true;

    } catch (e: any) {
      console.error("Anki Enhancement Error:", e);
      toast.error(e.message || 'Failed to send to Anki', {
         position: 'bottom-center',
         duration: 4000,
      });
      throw e;
    } finally {
      setIsEnhancing(prev => ({ ...prev, [sub.id]: false }));
    }
  }, [activeBook, ankiField, ankiPictureField, ankiAddCover, ankiAddTag]);

  return {
    enhanceCard,
    isEnhancing
  };
};
