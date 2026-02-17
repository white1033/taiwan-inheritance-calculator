import { useInheritance } from '../context/InheritanceContext';
import type { Relation } from '../types/models';
import { toString } from '../lib/fraction';

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

export function LeftPanel() {
  const { state, dispatch } = useInheritance();
  const hasSpouse = state.persons.some(p => p.relation === '配偶');

  return (
    <div className="w-80 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
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
                onClick={() => dispatch({ type: 'ADD_PERSON', payload: { relation } })}
                disabled={disabled}
                className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

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
