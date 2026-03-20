import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useStore } from '../../store/useStore';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<BaseModalProps> = ({ isOpen, onClose }) => {
  const { 
    theme, setTheme, 
    readerFont, setReaderFont, 
    readerFontSize, setReaderFontSize, 
    ankiField, ankiPictureField, ankiAddCover, ankiAddTag, setAnkiSettings, 
    dailyGoals, setDailyGoals 
  } = useStore();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-5">
        <SettingSection title="Typography">
          <SettingRow label="Font Family">
            <select 
              value={readerFont}
              onChange={(e) => setReaderFont(e.target.value)}
              className="bg-surface border border-border text-text rounded px-2 py-1 outline-none w-[160px] md:w-[220px] text-xs md:text-sm"
            >
              <option value="system-ui, -apple-system, sans-serif">System Sans</option>
              <option value="'Times New Roman', serif">Serif</option>
              <option value="'Hiragino Mincho ProN', 'Yu Mincho', serif">Yu Mincho (JP)</option>
              <option value="'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif">Yu Gothic (JP)</option>
              <option value="'Meiryo', sans-serif">Meiryo (JP)</option>
              <option value="'MS Gothic', monospace">MS Gothic (Monospace)</option>
            </select>
          </SettingRow>
          <SettingRow label="Font Size">
            <div className="flex items-center gap-3">
               <input 
                 type="range" 
                 min={16} 
                 max={72} 
                 step={2}
                 value={readerFontSize} 
                 onChange={(e) => setReaderFontSize(parseInt(e.target.value))}
                 className="w-[100px] md:w-[150px] accent-primary" 
               />
               <span className="text-primary font-mono font-bold w-8 text-right bg-primary/10 rounded px-1.5 py-0.5">{readerFontSize}</span>
            </div>
          </SettingRow>
        </SettingSection>

        <SettingSection title="Reader UI">
          <SettingRow label="Theme">
            <select 
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'kiku-dark' | 'kiku-light' | 'matcha')}
              className="bg-surface border border-border text-text rounded px-2 py-1 outline-none"
            >
              <option value="kiku-dark">Kiku Dark</option>
              <option value="kiku-light">Kiku Light</option>
              <option value="matcha">Matcha (Green)</option>
            </select>
          </SettingRow>
        </SettingSection>

        <SettingSection title="Translation">
          <SettingRow label="Target Language">
            <select className="bg-surface border border-border text-text rounded px-2 py-1 outline-none">
              <option value="en">English</option>
              <option value="es">Spanish</option>
            </select>
          </SettingRow>
        </SettingSection>

        <SettingSection title="Daily Goals">
          <SettingRow label="Reading Time (Minutes)">
            <input 
              type="number" 
              value={Math.round(dailyGoals.timeReadSeconds / 60)} 
              onChange={(e) => setDailyGoals({ timeReadSeconds: (parseInt(e.target.value) || 0) * 60 })}
              className="w-[70px] bg-bg border border-border text-text rounded px-2 py-1 text-center outline-none" 
            />
          </SettingRow>
          <SettingRow label="Cards Mined">
            <input 
              type="number" 
              value={dailyGoals.cardsMined} 
              onChange={(e) => setDailyGoals({ cardsMined: parseInt(e.target.value) || 0 })}
              className="w-[70px] bg-bg border border-border text-text rounded px-2 py-1 text-center outline-none" 
            />
          </SettingRow>
          <SettingRow label="Characters Read">
            <input 
              type="number" 
              value={dailyGoals.charactersRead} 
              onChange={(e) => setDailyGoals({ charactersRead: parseInt(e.target.value) || 0 })}
              className="w-[90px] bg-bg border border-border text-text rounded px-2 py-1 text-center outline-none" 
            />
          </SettingRow>
          <SettingRow label="Words Read">
            <input 
              type="number" 
              value={dailyGoals.wordsRead} 
              onChange={(e) => setDailyGoals({ wordsRead: parseInt(e.target.value) || 0 })}
              className="w-[90px] bg-bg border border-border text-text rounded px-2 py-1 text-center outline-none" 
            />
          </SettingRow>
        </SettingSection>

        <SettingSection title="Anki Enhancements">
          <SettingRow label="Anki Audio Field">
            <input 
              type="text" 
              value={ankiField} 
              onChange={(e) => setAnkiSettings({ ankiField: e.target.value })}
              className="w-[160px] bg-bg border border-border text-text rounded px-2 py-1 outline-none font-sans" 
            />
          </SettingRow>
          <SettingRow label="Anki Picture Field">
            <input 
              type="text" 
              value={ankiPictureField}
              onChange={(e) => setAnkiSettings({ ankiPictureField: e.target.value })}
              className="w-[160px] bg-bg border border-border text-text rounded px-2 py-1 outline-none font-sans" 
            />
          </SettingRow>
          <div className="text-xs text-text-muted italic -mt-2 mb-2 leading-snug">
            Note: AnkiConnect will <b>append</b> to these fields, not overwrite them.
          </div>
          <SettingRow label="Add Cover Art to Card">
            <input 
              type="checkbox" 
              checked={ankiAddCover}
              onChange={(e) => setAnkiSettings({ ankiAddCover: e.target.checked })}
              className="w-5 h-5 accent-primary cursor-pointer" 
            />
          </SettingRow>
          <SettingRow label="Tag Card with Book Title">
            <input 
              type="checkbox" 
              checked={ankiAddTag}
              onChange={(e) => setAnkiSettings({ ankiAddTag: e.target.checked })}
              className="w-5 h-5 accent-primary cursor-pointer" 
            />
          </SettingRow>
        </SettingSection>

        <div className="text-right mt-5">
          <Button variant="primary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
};

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingSection: React.FC<SettingSectionProps> = ({ title, children }) => {
  return (
    <div>
      <div className="text-xs font-bold text-primary uppercase tracking-widest mb-3 opacity-80">
        {title}
      </div>
      <div className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
};

interface SettingRowProps {
  label: string;
  children: React.ReactNode;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, children }) => {
  return (
    <div className="flex justify-between items-center">
      <label className="text-text text-sm flex-1">{label}</label>
      <div className="flex-1 flex justify-end items-center gap-2.5">
        {children}
      </div>
    </div>
  );
};
