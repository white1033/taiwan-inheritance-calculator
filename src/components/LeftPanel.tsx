import { useState } from 'react';
import { useInheritance } from '../hooks/useInheritance';
import { PersonEditor } from './PersonEditor';
import type { Relation } from '../types/models';
import { toString, toPercent } from '../lib/fraction';
import { PRESETS } from '../lib/presets';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';

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
  const existingRelations = new Set(state.persons.map(p => p.relation));
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);

  return (
    <div
      id="left-panel"
      className={[
        'no-print bg-white flex flex-col overflow-hidden border-r border-slate-200',
        // Tablet+: always visible, fixed width
        'md:relative md:translate-x-0 md:w-64 lg:w-80 2xl:w-96 md:z-auto',
        // Mobile: slide-in drawer
        'fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
    >
      {/* Close button for mobile */}
      <div className="md:hidden flex justify-end p-2 shrink-0">
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

      {/* Scrollable upper area */}
      <div className="flex-1 overflow-y-auto min-h-0">

      {/* Presets Selection */}
      <section className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          範例案例
        </h2>
        <Select
          value=""
          onChange={(e) => {
            const presetIndex = parseInt(e.target.value, 10);
            if (!isNaN(presetIndex) && PRESETS[presetIndex]) {
              if (state.persons.length > 0 && !window.confirm('載入範例會覆蓋目前的資料，是否繼續？')) {
                e.target.value = '';
                return;
              }
              const { decedent, persons } = PRESETS[presetIndex];
              dispatch({ type: 'LOAD_PERSONS', payload: { decedent, persons } });
              setSelectedPresetIndex(presetIndex);
            }
          }}
        >
          <option value="">-- 請選擇範例 --</option>
          {PRESETS.map((preset, index) => (
            <option key={index} value={index} title={preset.description}>
              {preset.label}
            </option>
          ))}
        </Select>
        {selectedPresetIndex != null && PRESETS[selectedPresetIndex] && (
          <p className="text-xs text-slate-500 mt-1">
            {PRESETS[selectedPresetIndex].description}
          </p>
        )}
        <Button
          variant="danger"
          className="w-full mt-2"
          onClick={() => {
            if (window.confirm('確定要清除所有資料嗎？')) {
              dispatch({ type: 'RESET_STATE' });
            }
          }}
        >
          清除所有資料
        </Button>
      </section>


      {/* Decedent Info */}
      <section className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          被繼承人資訊
        </h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="decedent-name" className="block text-sm text-slate-600 mb-1">姓名</label>
            <Input
              id="decedent-name"
              type="text"
              value={state.decedent.name}
              onChange={e => { dispatch({ type: 'SET_DECEDENT', payload: { name: e.target.value } }); setSelectedPresetIndex(null); }}
              placeholder="請輸入被繼承人姓名"
            />
          </div>
          <div>
            <label htmlFor="decedent-deathDate" className="block text-sm text-slate-600 mb-1">死亡日期</label>
            <Input
              id="decedent-deathDate"
              type="date"
              value={state.decedent.deathDate || ''}
              onChange={e => { dispatch({ type: 'SET_DECEDENT', payload: { deathDate: e.target.value } }); setSelectedPresetIndex(null); }}
            />
          </div>
          <div>
            <label htmlFor="decedent-estateAmount" className="block text-sm text-slate-600 mb-1">遺產總額（選填）</label>
            <Input
              id="decedent-estateAmount"
              type="number"
              min="0"
              value={state.decedent.estateAmount ?? ''}
              onChange={e => {
                const val = e.target.value;
                const num = val === '' ? undefined : Math.max(0, Number(val));
                dispatch({
                  type: 'SET_DECEDENT',
                  payload: { estateAmount: num }
                });
                setSelectedPresetIndex(null);
              }}
              placeholder="例：10,000,000"
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
            // 子女、兄弟姊妹可重複新增，其餘關係（配偶、父、母、祖父母等）只能有一個
            const isSingular = relation !== '子女' && relation !== '兄弟姊妹';
            const disabled = isSingular && existingRelations.has(relation);
            return (
              <Button
                key={relation}
                onClick={() => { dispatch({ type: 'ADD_PERSON', payload: { relation } }); setSelectedPresetIndex(null); onClose(); }}
                disabled={disabled}
                className="min-h-[44px]"
              >
                {label}
              </Button>
            );
          })}
        </div>
      </section>

      {/* Person Editor */}
      <PersonEditor />

      </div>{/* end scrollable upper area */}

      {/* Validation Errors + Results — sticky at bottom */}
      <section className="p-4 border-t border-slate-200 shrink-0 max-h-[40vh] overflow-y-auto bg-slate-50">
        {state.validationErrors.length > 0 && (
          <div className="mb-3 bg-red-50 border border-red-200 rounded-md p-2.5">
            <h3 className="text-xs font-semibold text-red-700 mb-1">
              驗證錯誤（{state.validationErrors.length}）
            </h3>
            <ul className="text-xs text-red-600 space-y-0.5">
              {state.validationErrors.map((err, i) => {
                const person = state.persons.find(p => p.id === err.personId);
                return (
                  <li key={i} className="flex gap-1">
                    <span className="font-medium shrink-0">{person?.name || '(未命名)'}：</span>
                    <span>{err.message}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
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
                      應繼分 {toString(r.inheritanceShare)} ({toPercent(r.inheritanceShare)})
                    </div>
                    {state.decedent.estateAmount != null && state.decedent.estateAmount > 0 && (
                      <div className="text-slate-600 text-xs">
                        約 {Math.round(state.decedent.estateAmount * r.inheritanceShare.n / r.inheritanceShare.d).toLocaleString()} 元
                      </div>
                    )}
                    <div className="text-slate-500 font-mono text-xs">
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
