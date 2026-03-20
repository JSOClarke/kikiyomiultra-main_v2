import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<BaseModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Controls">
      <div className="text-[0.85rem] text-text-muted leading-snug mb-3">
        Drag an <b className="text-text">.epub</b> or <b className="text-text">Audio/SRT</b> files to the Library drop zone to start.
      </div>

      <table className="w-full border-collapse text-[0.9rem]">
        <tbody>
          <KeyRow left="Play / Pause" right="Space / W" />
          <KeyRow left="Prev / Next Line" right="A / D" />
          <KeyRow left="Replay Line" right="S / ↓" />
          <KeyRow left="Toggle Focus Mode" right="F" />
          <KeyRow left="Anki Integration" right="C" />
          <KeyRow left="Translate Line" right="T" />
        </tbody>
      </table>

      <div className="text-right mt-5">
        <Button variant="primary" onClick={onClose}>Got it</Button>
      </div>
    </Modal>
  );
};

interface KeyRowProps {
  left: string;
  right: string;
}

const KeyRow: React.FC<KeyRowProps> = ({ left, right }) => {
  return (
    <tr>
      <td className="py-2 border-b border-border text-primary font-bold">
        {left}
      </td>
      <td className="py-2 border-b border-border text-right text-text-muted">
        {right}
      </td>
    </tr>
  );
};
