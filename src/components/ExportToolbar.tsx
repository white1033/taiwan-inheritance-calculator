import { useRef, useState } from 'react';
import { useInheritance } from '../hooks/useInheritance';
import { exportToExcel, importFromExcel } from '../lib/excel';
import { exportToPdf, exportToPng, printPage } from '../lib/pdf-export';
import { useToast } from '../hooks/useToast';
import { buildShareUrl } from '../lib/url-state';

type LoadingAction = 'print' | 'excel' | 'pdf' | 'png' | null;

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 inline-block mr-1" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function ExportToolbar() {
  const { state, dispatch } = useInheritance();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasErrors = state.validationErrors.length > 0;
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);

  async function guardedExport(action: LoadingAction, fn: () => Promise<void>) {
    if (hasErrors) {
      toast('請先修正所有驗證錯誤後再匯出', 'error');
      return;
    }
    setLoadingAction(action);
    try {
      await fn();
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importFromExcel(file);
      dispatch({ type: 'LOAD_PERSONS', payload: result });
    } catch (err) {
      toast('匯入失敗：' + (err instanceof Error ? err.message : '未知錯誤'), 'error');
    }
    // Reset file input so same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleExcelExport() {
    try {
      await exportToExcel(state.decedent, state.persons);
    } catch (err) {
      toast('Excel 匯出失敗：' + (err instanceof Error ? err.message : '未知錯誤'), 'error');
    }
  }

  async function handlePdfExport() {
    try {
      await exportToPdf('family-tree', '繼承系統表.pdf');
    } catch (err) {
      toast('PDF 匯出失敗：' + (err instanceof Error ? err.message : '未知錯誤'), 'error');
    }
  }

  async function handlePngExport() {
    try {
      await exportToPng('family-tree', '繼承系統圖.png');
    } catch (err) {
      toast('圖片匯出失敗：' + (err instanceof Error ? err.message : '未知錯誤'), 'error');
    }
  }

  const btnClass = (action: LoadingAction) =>
    `px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors whitespace-nowrap min-h-[44px] ${
      hasErrors || loadingAction ? 'opacity-40 cursor-not-allowed' : ''
    }${loadingAction === action ? ' pointer-events-none' : ''}`;

  return (
    <footer className="no-print bg-slate-50 border-t border-slate-200 px-3 py-2 lg:px-6 lg:py-3 flex flex-wrap gap-2 lg:gap-3">
      <button
        type="button"
        disabled={hasErrors || !!loadingAction}
        onClick={() => guardedExport('print', () => printPage('family-tree'))}
        className={btnClass('print')}
      >
        {loadingAction === 'print' && <Spinner />}
        列印
      </button>
      <button
        type="button"
        disabled={hasErrors || !!loadingAction}
        onClick={() => guardedExport('excel', handleExcelExport)}
        className={btnClass('excel')}
      >
        {loadingAction === 'excel' && <Spinner />}
        Excel 匯出
      </button>
      <button
        type="button"
        disabled={!!loadingAction}
        onClick={() => fileInputRef.current?.click()}
        className={`px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors whitespace-nowrap min-h-[44px] ${loadingAction ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        Excel 匯入
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImport}
      />
      <button
        type="button"
        disabled={hasErrors || !!loadingAction}
        onClick={() => guardedExport('pdf', handlePdfExport)}
        className={btnClass('pdf')}
      >
        {loadingAction === 'pdf' && <Spinner />}
        PDF 匯出
      </button>
      <button
        type="button"
        disabled={hasErrors || !!loadingAction}
        onClick={() => guardedExport('png', handlePngExport)}
        className={btnClass('png')}
      >
        {loadingAction === 'png' && <Spinner />}
        繼承系統圖
      </button>
      <button
        type="button"
        onClick={() => {
          const url = buildShareUrl(state.decedent, state.persons);
          navigator.clipboard.writeText(url).then(
            () => toast('已複製分享連結到剪貼簿', 'success'),
            () => toast('複製失敗，請手動複製', 'error'),
          );
        }}
        className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors whitespace-nowrap min-h-[44px]"
      >
        複製分享連結
      </button>
    </footer>
  );
}
