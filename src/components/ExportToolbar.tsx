export function ExportToolbar() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex gap-3">
      <button type="button" className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        列印
      </button>
      <button type="button" className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        Excel 匯出
      </button>
      <button type="button" className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        Excel 匯入
      </button>
      <button type="button" className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        PDF 匯出
      </button>
      <button type="button" className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        繼承系統圖
      </button>
    </footer>
  );
}
