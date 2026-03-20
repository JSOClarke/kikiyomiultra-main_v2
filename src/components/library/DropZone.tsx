import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../../store/usePlayerStore';
import { WorkerMessage, ParseConfig } from '../../workers/parser.worker';
import { apiClient } from '../../apiClient';

export const DropZone: React.FC = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const isParsing = usePlayerStore(state => state.isParsing);
  const parseProgress = usePlayerStore(state => state.parseProgress);
  const setParsingState = usePlayerStore(state => state.setParsingState);
  const setActiveBook = usePlayerStore(state => state.setActiveBook);
  const addBookToLibrary = usePlayerStore(state => state.addBookToLibrary);

  const handleFiles = (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    let targetFile: File | undefined = files[0];
    let type: 'audiobook' | 'epub' | 'srt' = 'epub';
    let audioFile: File | undefined;

    // Check if the user dropped exactly 2 files (Audio + SRT pair)
    if (files.length === 2) {
      const srt = files.find(f => f.name.toLowerCase().endsWith('.srt'));
      const audio = files.find(f => f.type.startsWith('audio/') || f.name.toLowerCase().endsWith('.m4b') || f.name.toLowerCase().endsWith('.mp3'));
      
      if (srt && audio) {
        targetFile = srt;
        type = 'srt';
        audioFile = audio;
      }
    }

    if (!targetFile) return;

    if (!audioFile) {
      const isAudio = targetFile.type.startsWith('audio/') || targetFile.name.toLowerCase().endsWith('.m4b') || targetFile.name.toLowerCase().endsWith('.mp3');
      if (isAudio) {
        type = 'audiobook';
      } else if (targetFile.name.toLowerCase().endsWith('.srt')) {
        type = 'srt';
      }
    }

    const worker = new Worker(new URL('../../workers/parser.worker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = async (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;

      if (msg.type === 'START') {
        setParsingState(true, 0);
      } else if (msg.type === 'PROGRESS') {
        // Dedicate 0-80% of the bar to the parser, the last 20% to the network
        setParsingState(true, (msg.progress || 0) * 0.8);
      } else if (msg.type === 'SUCCESS') {
        if (msg.payload) {
          try {
            setParsingState(true, 85); // Started network sync
            const book = msg.payload as any;
            
            // 1. Upload Primary Media Files
            if (book.type === 'audiobook') {
              const actualAudioFile = audioFile || targetFile;
              if (actualAudioFile) {
                const res = await apiClient.uploadMedia(actualAudioFile);
                book.audioUrl = res.path;
              }
            } else if (book.type === 'epub') {
              if (targetFile) await apiClient.uploadMedia(targetFile); // Store the raw epub too natively
            }
            
            setParsingState(true, 92);
            
            // 2. Upload extracted Cover Art
            if (book.coverBlob) {
               // Convert the raw ArrayBuffer/Blob back into a File format to bypass Multer blocks
               const coverFile = new File([book.coverBlob], 'cover.jpg', { type: 'image/jpeg' });
               const res = await apiClient.uploadMedia(coverFile);
               book.coverUrl = res.path;
            }
            
            setParsingState(true, 98);
            
            // 3. Strip massive raw volatile Memory blobs
            delete book.audioBlob;
            delete book.coverBlob;
            
            // 4. Serialize to Database
            await apiClient.saveBook(book);
            
            // 5. Update local UI state
            addBookToLibrary(book);
            setActiveBook(book);
            setParsingState(false, 100);
            navigate(`/player/${book.id}`);
          } catch (e) {
            console.error("Backend Upload Error", e);
            alert("Network Error: Failed to save to database. Is the backend running?");
            setParsingState(false, 0);
          }
        }
        worker.terminate();
      } else if (msg.type === 'ERROR') {
        setParsingState(false, 0);
        console.error("Worker Parsing Error:", msg.error);
        alert(`Error parsing file: ${msg.error}`);
        worker.terminate();
      }
    };

    worker.postMessage({ file: targetFile, type, audioFile } as ParseConfig);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isParsing) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onClick = () => {
    if (isParsing) return;
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // reset input so the same file can be selected again
    e.target.value = '';
  };

  const onMangaFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setParsingState(true, 5);
      try {
        const files = Array.from(e.target.files);
        // Defend against naked directory uploads avoiding silent server crashes
        const hasMokuro = files.some(f => f.name.endsWith('.mokuro') || f.name.endsWith('_ocr.json'));
        if (!hasMokuro) {
           alert("No .mokuro JSON file found inside this folder! Ensure it was processed by Mokuro first.");
           setParsingState(false, 0);
           return;
        }

        await apiClient.uploadMangaFolder(files, (progress) => {
          setParsingState(true, 5 + (progress * 0.9));
        });
        
        setParsingState(false, 100);
        // Fast hard-refresh to synchronize the global Library state implicitly bypassing local injection.
        window.location.reload(); 
      } catch (err: any) {
        console.error(err);
        alert(`Manga Upload Failed: ${err.message}`);
        setParsingState(false, 0);
      }
    }
    e.target.value = '';
  };

  return (
    <div
      onClick={onClick}
      onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
      className={`bg-surface border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 transition-all h-full min-h-[14rem] shadow-sm relative overflow-hidden
        ${isParsing ? 'cursor-wait border-primary/50' : 'cursor-pointer'}
        ${!isParsing && isDragOver 
          ? 'border-primary bg-primary/5 scale-[1.02]' 
          : 'border-white/10 dark:border-white/20 hover:border-white/30 hover:shadow-md active:scale-[0.98]'
        }
      `}
    >
      <input 
        type="file" 
        multiple
        ref={fileInputRef} 
        onChange={onFileChange} 
        className="hidden" 
        accept=".epub,.m4b,.mp3,.srt"
      />

      {isParsing ? (
        <div className="flex flex-col items-center justify-center relative w-full h-full">
           <Loader2 size={32} className="text-primary animate-spin mb-3 shadow-[0_0_15px_rgba(var(--color-primary),0.5)] rounded-full" />
           <div className="text-sm font-bold text-primary mb-1">Parsing Content...</div>
           
           <div className="w-full max-w-[12rem] h-2 bg-bg rounded-full mt-2 overflow-hidden shadow-inner">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out" 
                style={{ width: `${parseProgress}%` }}
              />
           </div>
        </div>
      ) : (
        <>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragOver ? 'bg-primary/20 text-primary' : 'bg-bg text-text-muted shadow-inner'}`}>
            <UploadCloud size={24} />
          </div>
          <div className="text-sm font-bold text-text text-center mb-1">
            Add New Immersion
          </div>
          <div className="text-xs text-text-muted text-center px-2 mb-6">
            Click to select an .epub, audio, or text file
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 relative z-10 w-full max-w-sm px-4">
             <button 
               onClick={(e) => { e.stopPropagation(); if (!isParsing) fileInputRef.current?.click(); }}
               className="flex-1 bg-surface hover:bg-surface-hover border border-white/5 text-text-muted hover:text-text font-bold text-[0.7rem] uppercase tracking-widest py-2 rounded-xl transition-colors"
             >
               Single File
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); if (!isParsing) folderInputRef.current?.click(); }}
               className="flex-1 bg-sec/10 hover:bg-sec/20 border border-sec/20 text-sec font-bold text-[0.7rem] uppercase tracking-widest py-2 rounded-xl transition-colors"
             >
               Manga Folder
             </button>
             {/* Invisible bindings */}
             <input 
               type="file" 
               multiple
               // @ts-ignore
               webkitdirectory=""
               directory=""
               ref={folderInputRef} 
               onChange={onMangaFolderChange} 
               className="hidden" 
             />
          </div>
        </>
      )}
    </div>
  );
}
