import { useInheritance } from '../context/InheritanceContext';
import { INHERITANCE_STATUS_OPTIONS, RELATION_OPTIONS } from '../types/models';
import type { Person } from '../types/models';

export function PersonEditor() {
  const { state, dispatch } = useInheritance();

  if (!state.selectedPersonId) return null;

  const person = state.persons.find(p => p.id === state.selectedPersonId);
  if (!person) return null;

  function update(updates: Partial<Person>) {
    dispatch({ type: 'UPDATE_PERSON', payload: { id: person!.id, updates } });
  }

  return (
    <section className="p-4 border-b border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          編輯繼承人
        </h2>
        <button
          type="button"
          onClick={() => dispatch({ type: 'SELECT_PERSON', payload: { id: null } })}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          關閉
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="person-name" className="block text-sm text-slate-600 mb-1">姓名</label>
          <input
            id="person-name"
            type="text"
            value={person.name}
            onChange={e => update({ name: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="請輸入姓名"
          />
        </div>

        <div>
          <label htmlFor="person-relation" className="block text-sm text-slate-600 mb-1">稱謂</label>
          <select
            id="person-relation"
            value={person.relation}
            onChange={e => update({ relation: e.target.value as Person['relation'] })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {RELATION_OPTIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="person-status" className="block text-sm text-slate-600 mb-1">繼承狀態</label>
          <select
            id="person-status"
            value={person.status}
            onChange={e => update({ status: e.target.value as Person['status'] })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {INHERITANCE_STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {(person.status === '代位繼承' || (person.status === '再轉繼承' && person.relation !== '配偶')) && (
          <div>
            <label htmlFor="person-parentId" className="block text-sm text-slate-600 mb-1">被代位/再轉者</label>
            <select
              id="person-parentId"
              value={person.parentId || ''}
              onChange={e => update({ parentId: e.target.value || undefined })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">請選擇</option>
              {state.persons
                .filter(p => p.id !== person.id && (p.status === '死亡' || p.status === '再轉繼承'))
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name || '(未命名)'}</option>
                ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="person-birthDate" className="block text-sm text-slate-600 mb-1">出生日期</label>
          <input
            id="person-birthDate"
            type="date"
            value={person.birthDate || ''}
            onChange={e => update({ birthDate: e.target.value || undefined })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="person-deathDate" className="block text-sm text-slate-600 mb-1">死亡日期</label>
          <input
            id="person-deathDate"
            type="date"
            value={person.deathDate || ''}
            onChange={e => update({ deathDate: e.target.value || undefined })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="person-marriageDate" className="block text-sm text-slate-600 mb-1">結婚日期</label>
          <input
            id="person-marriageDate"
            type="date"
            value={person.marriageDate || ''}
            onChange={e => update({ marriageDate: e.target.value || undefined })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="person-divorceDate" className="block text-sm text-slate-600 mb-1">離婚日期</label>
          <input
            id="person-divorceDate"
            type="date"
            value={person.divorceDate || ''}
            onChange={e => update({ divorceDate: e.target.value || undefined })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="button"
          onClick={() => dispatch({ type: 'DELETE_PERSON', payload: { id: person.id } })}
          className="w-full mt-2 px-3 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
        >
          刪除此繼承人
        </button>
      </div>
    </section>
  );
}
