import { useRef } from 'react';
import { useInheritance } from '../context/InheritanceContext';
import { exportToExcel, importFromExcel } from '../lib/excel';
import { exportToPdf, exportToPng, printPage } from '../lib/pdf-export';

export function ExportToolbar() {
  const { state, dispatch } = useInheritance();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importFromExcel(file);
      dispatch({ type: 'LOAD_PERSONS', payload: result });
    } catch (err) {
      alert('匯入失敗：' + (err instanceof Error ? err.message : '未知錯誤'));
    }
    // Reset file input so same file can be re-imported
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handlePdfExport() {
    try {
      await exportToPdf('app-root', '繼承系統表.pdf');
    } catch (err) {
      alert('PDF 匯出失敗：' + (err instanceof Error ? err.message : '未知錯誤'));
    }
  }

  async function handlePngExport() {
    try {
      await exportToPng('family-tree', '繼承系統圖.png');
    } catch (err) {
      alert('圖片匯出失敗：' + (err instanceof Error ? err.message : '未知錯誤'));
    }
  }

  return (
    <footer className="no-print bg-slate-50 border-t border-slate-200 px-3 py-2 lg:px-6 lg:py-3 flex gap-2 lg:gap-3 overflow-x-auto">
      <button
        type="button"
        onClick={() => printPage()}
        className="shrink-0 px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
      >
        列印
      </button>
      <button
        type="button"
        onClick={() => exportToExcel(state.decedent, state.persons)}
        className="shrink-0 px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
      >
        Excel 匯出
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="shrink-0 px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
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
        onClick={handlePdfExport}
        className="shrink-0 px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
      >
        PDF 匯出
      </button>
      <button
        type="button"
        onClick={handlePngExport}
        className="shrink-0 px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
      >
        繼承系統圖
      </button>
    </footer>
  );
}
