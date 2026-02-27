import { useState, useRef, useEffect } from 'react';
import { useExport } from '../hooks/useExport';

interface HeaderProps {
  onTogglePanel: () => void;
  panelOpen?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 inline-block mr-1" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function Header({ onTogglePanel, panelOpen, canUndo, canRedo, onUndo, onRedo }: HeaderProps) {
  const { handlePrint, handleExcel, handlePng, handleShareLink, loadingAction, hasErrors } =
    useExport();
  const [exportOpen, setExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  const itemDisabled = hasErrors || loadingAction !== null;

  function handleItemClick(handler: () => void) {
    handler();
    setExportOpen(false);
  }

  return (
    <header className="no-print bg-slate-800 text-white px-4 py-3 lg:px-6 lg:py-4 flex items-center gap-3 landscape-compact">
      <button
        type="button"
        onClick={onTogglePanel}
        className="md:hidden p-2 rounded-md hover:bg-slate-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Toggle panel"
        aria-expanded={panelOpen}
        aria-controls="left-panel"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex-1">
        <h1 className="text-lg lg:text-xl font-bold">繼承系統表計算工具</h1>
        <p className="text-slate-300 text-xs lg:text-sm mt-0.5 lg:mt-1 landscape-hide">
          依據台灣民法繼承編，計算法定應繼分與特留分
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="復原"
          title="復原 (Ctrl+Z)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="重做"
          title="重做 (Ctrl+Y)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
          </svg>
        </button>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setExportOpen((prev) => !prev)}
            className="p-2 rounded-md hover:bg-slate-700 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center gap-1 text-sm"
            aria-label="匯出"
          >
            匯出
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {exportOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white text-slate-800 rounded-md shadow-lg border border-slate-200 py-1 z-50">
              <button
                type="button"
                disabled={itemDisabled}
                onClick={() => handleItemClick(handlePrint)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingAction === 'print' && <Spinner />}
                列印
              </button>
              <button
                type="button"
                disabled={itemDisabled}
                onClick={() => handleItemClick(handleExcel)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingAction === 'excel' && <Spinner />}
                Excel 匯出
              </button>
              <button
                type="button"
                disabled={itemDisabled}
                onClick={() => handleItemClick(handlePng)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingAction === 'png' && <Spinner />}
                繼承系統圖
              </button>
              <button
                type="button"
                disabled={itemDisabled}
                onClick={() => handleItemClick(handleShareLink)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                複製分享連結
              </button>
              <div className="border-t border-slate-200 mt-1 pt-1 px-4 pb-1">
                <p className="text-xs text-slate-400">本工具僅供參考，不構成法律意見</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
