import { useState } from 'react';

const EDGE_ITEMS: readonly { label: string; color: string; dash: string | false }[] = [
  { label: '直系血親', color: '#64748b', dash: false },
  { label: '婚姻關係', color: '#94a3b8', dash: false },
  { label: '代位繼承', color: '#64748b', dash: '5,5' },
  { label: '再轉繼承', color: '#64748b', dash: '3,3' },
];

const NODE_COLORS = [
  { label: '一般繼承', color: 'bg-green-500' },
  { label: '死亡', color: 'bg-gray-400' },
  { label: '死亡絕嗣', color: 'bg-gray-400' },
  { label: '拋棄繼承', color: 'bg-red-500' },
  { label: '代位繼承', color: 'bg-emerald-400' },
  { label: '再轉繼承', color: 'bg-orange-400' },
  { label: '被繼承人', color: 'bg-slate-700' },
] as const;

export function TreeLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="no-print absolute top-2 right-2 z-10">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="bg-white border border-slate-200 shadow-sm rounded-md px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        aria-label="圖例"
      >
        圖例
      </button>
      {open && (
        <div className="absolute top-9 right-0 bg-white border border-slate-200 shadow-lg rounded-lg p-3 w-48">
          <h3 className="text-xs font-semibold text-slate-500 mb-2">邊線樣式</h3>
          <div className="space-y-1.5 mb-3">
            {EDGE_ITEMS.map(item => (
              <div key={item.label} className="flex items-center gap-2 text-xs text-slate-600">
                <svg width="24" height="8" className="shrink-0">
                  <line
                    x1="0" y1="4" x2="24" y2="4"
                    stroke={item.color}
                    strokeWidth="2"
                    strokeDasharray={item.dash || undefined}
                  />
                </svg>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <h3 className="text-xs font-semibold text-slate-500 mb-2">節點狀態</h3>
          <div className="space-y-1.5">
            {NODE_COLORS.map(item => (
              <div key={item.label} className="flex items-center gap-2 text-xs text-slate-600">
                <span className={`w-3 h-3 rounded-sm ${item.color} shrink-0`} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
