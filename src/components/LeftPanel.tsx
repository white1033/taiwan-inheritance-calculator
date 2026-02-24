import { useInheritance } from '../hooks/useInheritance';
import { PersonEditor } from './PersonEditor';
import type { Relation } from '../types/models';
import { toString } from '../lib/fraction';
import { PRESETS } from '../lib/presets';

const HEIR_BUTTONS: { label: string; relation: Relation }[] = [
  { label: '+ 配偶', relation: '配偶' },
  { label: '+ 子女', relation: '子女' },
  { label: '+ 父', relation: '父' },
  { label: '+ 母', relation: '母' },
  { label: '+ 兄弟姊妹', relation: '兄弟姊妹' },
  { label: '+ 祖父', relation: '祖父' },
  { label: '+ 祖母', relation: '祖母' },
  { label: '+ 外祖父', relation: '外祖父' },
  { label: '+ 外祖母', relation: '外祖母' },
];

interface LeftPanelProps {
  open: boolean;
  onClose: () => void;
}

export function LeftPanel({ open, onClose }: LeftPanelProps) {
  const { state, dispatch } = useInheritance();
  const hasSpouse = state.persons.some(p => p.relation === '配偶');

  return (
    <div
      className={[
        'bg-white flex flex-col overflow-y-auto border-r border-slate-200',
        // Tablet+: always visible, fixed width
        'md:relative md:translate-x-0 md:w-64 lg:w-80 2xl:w-96 md:z-auto',
        // Mobile: slide-in drawer
        'fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
    >
      {/* Close button for mobile */}
      <div className="md:hidden flex justify-end p-2">
        <button
          type="button"
          onClick={onClose}
          className="p-2.5 rounded-md hover:bg-slate-100 transition-colors text-slate-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Presets Selection */}
      <section className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          範例案例
        </h2>
        <select
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value=""
          onChange={(e) => {
            const presetIndex = parseInt(e.target.value, 10);
            if (!isNaN(presetIndex) && PRESETS[presetIndex]) {
              const { decedent, persons } = PRESETS[presetIndex];
              dispatch({ type: 'LOAD_PERSONS', payload: { decedent, persons } });
            }
          }}
        >
          <option value="">-- 請選擇範例 --</option>
          {PRESETS.map((preset, index) => (
            <option key={index} value={index}>
              {preset.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="w-full mt-2 px-3 py-2 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
          onClick={() => {
            if (window.confirm('確定要清除所有資料嗎？')) {
              dispatch({ type: 'RESET_STATE' });
            }
          }}
        >
          清除所有資料
        </button>
      </section>


      {/* Decedent Info */}
      <section className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          被繼承人資訊
        </h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="decedent-name" className="block text-sm text-slate-600 mb-1">姓名</label>
            <input
              id="decedent-name"
              type="text"
              value={state.decedent.name}
              onChange={e => dispatch({ type: 'SET_DECEDENT', payload: { name: e.target.value } })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="請輸入被繼承人姓名"
            />
          </div>
          <div>
            <label htmlFor="decedent-deathDate" className="block text-sm text-slate-600 mb-1">死亡日期</label>
            <input
              id="decedent-deathDate"
              type="date"
              value={state.decedent.deathDate || ''}
              onChange={e => dispatch({ type: 'SET_DECEDENT', payload: { deathDate: e.target.value } })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Add Heir Buttons */}
      <section className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          新增繼承人
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {HEIR_BUTTONS.map(({ label, relation }) => {
            const disabled = relation === '配偶' && hasSpouse;
            return (
              <button
                type="button"
                key={relation}
                onClick={() => { dispatch({ type: 'ADD_PERSON', payload: { relation } }); onClose(); }}
                disabled={disabled}
                className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Person Editor */}
      <PersonEditor />

      {/* Results Summary */}
      <section className="p-4 flex-1">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          計算結果
        </h2>
        {state.results.length === 0 ? (
          <p className="text-sm text-slate-400">請先新增繼承人</p>
        ) : (
          <div className="space-y-2">
            {state.results
              .filter(r => r.inheritanceShare.n > 0)
              .map(r => (
                <div key={r.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                  <span className="font-medium">{r.name || '(未命名)'}</span>
                  <div className="text-right">
                    <div className="text-blue-600 font-mono">
                      應繼分 {toString(r.inheritanceShare)}
                    </div>
                    <div className="text-slate-400 font-mono text-xs">
                      特留分 {toString(r.reservedShare)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
