import { useRef } from 'react';
import { useInheritance } from '../context/InheritanceContext';
import { exportToExcel, importFromExcel } from '../lib/excel';

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

  return (
    <footer className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex gap-3">
      <button type="button" className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        列印
      </button>
      <button
        type="button"
        onClick={() => exportToExcel(state.decedent, state.persons)}
        className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors"
      >
        Excel 匯出
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors"
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
      <button type="button" className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        PDF 匯出
      </button>
      <button type="button" className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        繼承系統圖
      </button>
    </footer>
  );
}
