import { useState } from "react";
import { useInheritance } from "../hooks/useInheritance";
import { PersonEditor } from "./PersonEditor";
import type { Relation } from "../types/models";
import { toString, toPercent } from "../lib/fraction";
import { PRESETS } from "../lib/presets";
import { Input } from "./ui/Input";
import { Select } from "./ui/Select";
import { Button } from "./ui/Button";

// Grouped heir buttons for clearer visualization of inheritance order
const HEIR_BUTTON_GROUPS: { title: string, description?: string, buttons: { label: string; relation: Relation }[] }[] = [
  {
    title: "配偶",
    description: "當然繼承人",
    buttons: [{ label: "+ 配偶", relation: "配偶" }],
  },
  {
    title: "第一順位",
    description: "直系血親卑親屬",
    buttons: [{ label: "+ 子女", relation: "子女" }],
  },
  {
    title: "第二順位",
    buttons: [
      { label: "+ 父", relation: "父" },
      { label: "+ 母", relation: "母" },
    ],
  },
  {
    title: "第三順位",
    buttons: [{ label: "+ 兄弟姊妹", relation: "兄弟姊妹" }],
  },
  {
    title: "第四順位",
    buttons: [
      { label: "+ 祖父", relation: "祖父" },
      { label: "+ 祖母", relation: "祖母" },
      { label: "+ 外祖父", relation: "外祖父" },
      { label: "+ 外祖母", relation: "外祖母" },
    ],
  },
];

type Tab = "settings" | "edit" | "results";

interface LeftPanelProps {
  open: boolean;
  onClose: () => void;
}

export function LeftPanel({ open, onClose }: LeftPanelProps) {
  const { state, dispatch } = useInheritance();
  const existingRelations = new Set(state.persons.map(p => p.relation));
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  
  // Use state.selectedPersonId to determine if we should auto-switch to edit tab
  const [activeTab, setActiveTab] = useState<Tab>("settings");
  const [prevSelectedPersonId, setPrevSelectedPersonId] = useState(state.selectedPersonId);

  // If a new person is selected from outside the panel (e.g. clicking tree node),
  // we want to switch to the "edit" tab. But we avoid `useEffect` by doing it during render
  // pattern: deriving state from props/external state change.
  if (state.selectedPersonId !== prevSelectedPersonId) {
    setPrevSelectedPersonId(state.selectedPersonId);
    if (state.selectedPersonId) {
      setActiveTab("edit");
    }
  }

  const renderTabs = () => (
    <div className="flex border-b border-slate-200 shrink-0">
      <button
        type="button"
        className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
          activeTab === "settings"
            ? "border-blue-600 text-blue-600 bg-blue-50/50"
            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
        }`}
        onClick={() => setActiveTab("settings")}
      >
        設定
      </button>
      <button
        type="button"
        className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
          activeTab === "edit"
            ? "border-blue-600 text-blue-600 bg-blue-50/50"
            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
        }`}
        onClick={() => setActiveTab("edit")}
      >
        編輯
      </button>
      <button
        type="button"
        className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
          activeTab === "results"
            ? "border-blue-600 text-blue-600 bg-blue-50/50"
            : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
        }`}
        onClick={() => setActiveTab("results")}
      >
        結果
      </button>
    </div>
  );

  const renderSettings = () => (
    <div className="flex-1 overflow-y-auto">
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
              onChange={e => { dispatch({ type: "SET_DECEDENT", payload: { name: e.target.value } }); setSelectedPresetIndex(null); }}
              placeholder="請輸入被繼承人姓名"
            />
          </div>
          <div>
            <label htmlFor="decedent-deathDate" className="block text-sm text-slate-600 mb-1">死亡日期</label>
            <Input
              id="decedent-deathDate"
              type="date"
              value={state.decedent.deathDate || ""}
              onChange={e => { dispatch({ type: "SET_DECEDENT", payload: { deathDate: e.target.value } }); setSelectedPresetIndex(null); }}
            />
          </div>
          <div>
            <label htmlFor="decedent-estateAmount" className="block text-sm text-slate-600 mb-1">遺產總額（選填）</label>
            <Input
              id="decedent-estateAmount"
              type="number"
              min="0"
              value={state.decedent.estateAmount ?? ""}
              onChange={e => {
                const val = e.target.value;
                const num = val === "" ? undefined : Math.max(0, Number(val));
                dispatch({
                  type: "SET_DECEDENT",
                  payload: { estateAmount: num }
                });
                setSelectedPresetIndex(null);
              }}
              placeholder="例：10,000,000"
            />
          </div>
        </div>
      </section>

      {/* Add Heir Buttons - Grouped */}
      <section className="p-4 border-b border-slate-200 bg-slate-50/50">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          新增繼承人
        </h2>
        <div className="space-y-4">
          {HEIR_BUTTON_GROUPS.map((group, groupIdx) => (
            <div key={groupIdx} className="relative">
              <div className="flex items-baseline justify-between mb-2">
                 <h3 className="text-xs font-medium text-slate-700">{group.title}</h3>
                 {group.description && (
                   <span className="text-[10px] text-slate-400">{group.description}</span>
                 )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {group.buttons.map(({ label, relation }) => {
                  let disabled: boolean;
                  if (relation === "配偶") {
                    // 配偶：只要有現任活躍配偶就不能再新增
                    disabled = state.persons.some(
                      p => p.relation === "配偶" && !p.parentId && !p.divorceDate && p.status !== "死亡"
                    );
                  } else if (relation === "子女" || relation === "兄弟姊妹") {
                    disabled = false;
                  } else {
                    disabled = existingRelations.has(relation);
                  }
                  return (
                    <Button
                      key={relation}
                      onClick={() => {
                        dispatch({ type: "ADD_PERSON", payload: { relation } });
                        setSelectedPresetIndex(null);
                        // Optional: switch to edit tab? Keeping it on settings for faster multi-add might be better
                      }}
                      disabled={disabled}
                      className={`min-h-[40px] text-sm ${group.buttons.length === 1 ? "col-span-2" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-blue-300 hover:bg-blue-50"}`}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Presets Selection moved to bottom of settings */}
      <section className="p-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          範例案例
        </h2>
        <Select
          value={selectedPresetIndex !== null ? selectedPresetIndex.toString() : ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "") {
              setSelectedPresetIndex(null);
              return;
            }
            const presetIndex = parseInt(val, 10);
            if (!isNaN(presetIndex) && PRESETS[presetIndex]) {
              if (state.persons.length > 0 && !window.confirm("載入範例會覆蓋目前的資料，是否繼續？")) {
                return;
              }
              const { decedent, persons } = PRESETS[presetIndex];
              dispatch({ type: "LOAD_PERSONS", payload: { decedent, persons } });
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
          <p className="text-xs text-slate-500 mt-2 p-2 bg-slate-100 rounded">
            {PRESETS[selectedPresetIndex].description}
          </p>
        )}
      </section>
    </div>
  );

  const renderEdit = () => (
    <div className="flex-1 overflow-y-auto">
      {state.selectedPersonId ? (
        <PersonEditor />
      ) : (
        <div className="p-8 text-center text-slate-400">
          <p className="text-sm">請在右側圖表中點擊節點<br/>以編輯繼承人資料</p>
        </div>
      )}
    </div>
  );

  const renderResults = () => {
    const validResults = state.results.filter(r => r.inheritanceShare.n > 0);

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {state.validationErrors.length > 0 && (
          <div className="shrink-0 p-4 border-b border-slate-200">
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                驗證錯誤（{state.validationErrors.length}）
              </h3>
              <ul className="text-sm text-red-600 space-y-1 ml-5 list-disc">
                {state.validationErrors.map((err, i) => {
                  const person = state.persons.find(p => p.id === err.personId);
                  return (
                    <li key={i}>
                      <span className="font-medium">{person?.name || "(未命名)"}</span>：{err.message}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">計算結果</h2>
          
          {state.results.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <p>請先新增繼承人</p>
            </div>
          ) : validResults.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <p>目前沒有人有繼承權</p>
            </div>
          ) : (
            <div className="space-y-4">
              {validResults.map(r => {
                const percentageStr = toPercent(r.inheritanceShare);
                // Convert percentage string like "16.67%" to number 16.67 for the progress bar width
                const percentageNum = parseFloat(percentageStr) || 0;
                
                return (
                  <div key={r.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <div className="font-bold text-slate-800 text-lg">{r.name || "(未命名)"}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          應繼分：<span className="font-mono">{toString(r.inheritanceShare)}</span>
                          <span className="mx-2">|</span>
                          特留分：<span className="font-mono">{toString(r.reservedShare)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-600 font-bold text-xl">{percentageStr}</div>
                      </div>
                    </div>
                    
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-2.5 rounded-full" 
                        style={{ width: `${percentageNum}%` }}
                      ></div>
                    </div>

                    {state.decedent.estateAmount != null && state.decedent.estateAmount > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-sm text-slate-500">分配金額估算</span>
                        <span className="text-lg font-bold text-emerald-600">
                          {Math.round(state.decedent.estateAmount * r.inheritanceShare.n / r.inheritanceShare.d).toLocaleString()} <span className="text-sm font-normal">NTD</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      id="left-panel"
      className={[
        "no-print bg-white flex flex-col overflow-hidden border-r border-slate-200",
        // Tablet+: always visible, fixed width
        "md:relative md:translate-x-0 md:w-80 lg:w-96 2xl:w-[400px] md:z-auto",
        // Mobile: slide-in drawer
        "fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] transition-transform duration-300 ease-in-out shadow-xl md:shadow-none",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      ].join(" ")}
    >
      {/* Mobile Header with Close button */}
      <div className="md:hidden flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
        <span className="font-semibold text-slate-700">繼承計算機</span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-md hover:bg-slate-200 transition-colors text-slate-500 flex items-center justify-center"
          aria-label="Close panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {renderTabs()}

      {/* Tab Content Area */}
      {activeTab === "settings" && renderSettings()}
      {activeTab === "edit" && renderEdit()}
      {activeTab === "results" && renderResults()}

    </div>
  );
}

