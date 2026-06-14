import { Keyboard, X } from 'lucide-react';
import { shortcutActions } from '../utils/keyboardShortcuts';

interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

const groupLabels = {
  file: '파일',
  edit: '편집',
  draw: '도형',
  view: '보기',
};

export function ShortcutHelp({ open, onClose }: ShortcutHelpProps) {
  if (!open) return null;
  return (
    <div className="shortcut-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="shortcut-dialog" role="dialog" aria-modal="true" aria-label="단축키 도움말" onMouseDown={(event) => event.stopPropagation()}>
        <div className="shortcut-title">
          <div>
            <Keyboard size={20} />
            <strong>단축키</strong>
          </div>
          <button className="icon-button" onClick={onClose} title="닫기">
            <X size={16} />
          </button>
        </div>
        <div className="shortcut-grid">
          {(['file', 'edit', 'draw', 'view'] as const).map((group) => (
            <section key={group} className="shortcut-section">
              <h2>{groupLabels[group]}</h2>
              {shortcutActions.filter((item) => item.group === group).map((item) => (
                <div key={item.id} className="shortcut-row">
                  <kbd>{item.keys}</kbd>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
