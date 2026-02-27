import { useExport, type ExportAction } from '../hooks/useExport';

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 inline-block mr-1" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function ExportToolbar() {
  const { handlePrint, handleExcel, handlePng, handleShareLink, loadingAction, hasErrors } =
    useExport();

  const btnClass = (action: ExportAction) =>
    `px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors whitespace-nowrap min-h-[44px] ${
      hasErrors || loadingAction ? 'opacity-40 cursor-not-allowed' : ''
    }${loadingAction === action ? ' pointer-events-none' : ''}`;

  return (
    <footer className="no-print bg-slate-50 border-t border-slate-200 px-3 py-2 lg:px-6 lg:py-3 grid grid-cols-3 sm:flex sm:flex-wrap gap-2 lg:gap-3">
      <button
        type="button"
        disabled={hasErrors || !!loadingAction}
        onClick={handlePrint}
        className={btnClass('print')}
      >
        {loadingAction === 'print' && <Spinner />}
        列印
      </button>
      <button
        type="button"
        disabled={hasErrors || !!loadingAction}
        onClick={handleExcel}
        className={btnClass('excel')}
      >
        {loadingAction === 'excel' && <Spinner />}
        Excel 匯出
      </button>
      <button
        type="button"
        disabled={hasErrors || !!loadingAction}
        onClick={handlePng}
        className={btnClass('png')}
      >
        {loadingAction === 'png' && <Spinner />}
        繼承系統圖
      </button>
      <button
        type="button"
        onClick={handleShareLink}
        className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors whitespace-nowrap min-h-[44px]"
      >
        複製分享連結
      </button>
    </footer>
  );
}
