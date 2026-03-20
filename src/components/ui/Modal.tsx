import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  titleColor?: string;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  titleColor = 'var(--primary)',
  maxWidth = 'max-w-[500px]',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 w-full h-full bg-black/40 z-[200] flex justify-center items-center backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className={`bg-surface p-6 rounded w-[90%] ${maxWidth} border border-border shadow-[0_10px_25px_rgba(0,0,0,0.2)] max-h-[85vh] flex flex-col overflow-y-auto`}
      >
        {title && (
          <h2 className="mt-0 mb-6 font-bold text-xl" style={{ color: titleColor }}>
            {title}
          </h2>
        )}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
