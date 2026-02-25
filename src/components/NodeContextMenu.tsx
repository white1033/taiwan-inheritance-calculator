import { useRef, useEffect, useState } from 'react';

interface NodeContextMenuProps {
  x: number;
  y: number;
  personId: string;
  isDecedent: boolean;
  isSpouse: boolean;
  hasCurrentSpouse: boolean;
  onAddChild: (parentId: string) => void;
  onAddSpouse: (parentId: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function NodeContextMenu({
  x,
  y,
  personId,
  isDecedent,
  isSpouse,
  hasCurrentSpouse,
  onAddChild,
  onAddSpouse,
  onEdit,
  onDelete,
  onClose,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useEffect(() => {
    const firstButton = menuRef.current?.querySelector<HTMLButtonElement>('button');
    firstButton?.focus();
  }, []);

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const clampedLeft = Math.min(x, window.innerWidth - rect.width - 8);
    const clampedTop = Math.min(y, window.innerHeight - rect.height - 8);
    setPos({ left: Math.max(8, clampedLeft), top: Math.max(8, clampedTop) });
  }, [x, y]);

  function handleMenuKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
      const current = document.activeElement as HTMLButtonElement;
      const idx = buttons.indexOf(current);
      if (idx < 0) return;
      const next = e.key === 'ArrowDown'
        ? buttons[(idx + 1) % buttons.length]
        : buttons[(idx - 1 + buttons.length) % buttons.length];
      next?.focus();
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        role="presentation"
        aria-hidden="true"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      />
      <div
        ref={menuRef}
        role="menu"
        aria-label="節點操作選單"
        className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]"
        style={{ left: pos.left, top: pos.top }}
        onKeyDown={handleMenuKeyDown}
      >
        {!isSpouse && (
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
            onClick={() => { onAddChild(personId); onClose(); }}
          >
            + 新增子女
          </button>
        )}
        {!isDecedent && !isSpouse && !hasCurrentSpouse && (
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
            onClick={() => { onAddSpouse(personId); onClose(); }}
          >
            + 新增配偶
          </button>
        )}
        <div className="border-t border-slate-100 my-1" />
        <button
          type="button"
          role="menuitem"
          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
          onClick={() => { onEdit(personId); onClose(); }}
        >
          編輯
        </button>
        {!isDecedent && (
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => { onDelete(personId); onClose(); }}
          >
            刪除
          </button>
        )}
      </div>
    </>
  );
}
