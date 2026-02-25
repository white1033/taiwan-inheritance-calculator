import { useInheritance } from '../hooks/useInheritance';
import { INHERITANCE_STATUS_OPTIONS, RELATION_OPTIONS } from '../types/models';
import type { Person } from '../types/models';
import { countDescendants } from '../lib/person-utils';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';

export function PersonEditor() {
  const { state, dispatch } = useInheritance();

  if (!state.selectedPersonId) return null;

  const person = state.persons.find(p => p.id === state.selectedPersonId);
  if (!person) return null;

  const errors = state.validationErrors.filter(e => e.personId === person.id);
  function fieldError(field: string): string | undefined {
    return errors.find(e => e.field === field)?.message;
  }

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
          <Input
            id="person-name"
            type="text"
            value={person.name}
            onChange={e => update({ name: e.target.value })}
            hasError={!!fieldError('name')}
            placeholder="請輸入姓名"
          />
          {fieldError('name') && (
            <p className="text-xs text-red-500 mt-1">{fieldError('name')}</p>
          )}
        </div>

        <div>
          <label htmlFor="person-relation" className="block text-sm text-slate-600 mb-1">稱謂</label>
          <Select
            id="person-relation"
            value={person.relation}
            onChange={e => update({ relation: e.target.value as Person['relation'] })}
            hasError={!!fieldError('relation')}
          >
            {RELATION_OPTIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
          {fieldError('relation') && (
            <p className="text-xs text-red-500 mt-1">{fieldError('relation')}</p>
          )}
        </div>

        <div>
          <label htmlFor="person-status" className="block text-sm text-slate-600 mb-1">繼承狀態</label>
          <Select
            id="person-status"
            value={person.status}
            onChange={e => update({ status: e.target.value as Person['status'] })}
          >
            {INHERITANCE_STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>

        {(person.status === '代位繼承' || (person.status === '再轉繼承' && person.relation !== '配偶')) && (
          <div>
            <label htmlFor="person-parentId" className="block text-sm text-slate-600 mb-1">被代位/再轉者</label>
            <Select
              id="person-parentId"
              value={person.parentId || ''}
              onChange={e => update({ parentId: e.target.value || undefined })}
              hasError={!!fieldError('parentId')}
            >
              <option value="">請選擇</option>
              {state.persons
                .filter(p => p.id !== person.id && (p.status === '死亡' || p.status === '再轉繼承'))
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name || '(未命名)'}</option>
                ))}
            </Select>
            {fieldError('parentId') && (
              <p className="text-xs text-red-500 mt-1">{fieldError('parentId')}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="person-birthDate" className="block text-sm text-slate-600 mb-1">出生日期</label>
          <Input
            id="person-birthDate"
            type="date"
            value={person.birthDate || ''}
            onChange={e => update({ birthDate: e.target.value || undefined })}
          />
        </div>

        <div>
          <label htmlFor="person-deathDate" className="block text-sm text-slate-600 mb-1">死亡日期</label>
          <Input
            id="person-deathDate"
            type="date"
            value={person.deathDate || ''}
            onChange={e => update({ deathDate: e.target.value || undefined })}
            hasError={!!fieldError('deathDate')}
          />
          {fieldError('deathDate') && (
            <p className="text-xs text-red-500 mt-1">{fieldError('deathDate')}</p>
          )}
        </div>

        <div>
          <label htmlFor="person-marriageDate" className="block text-sm text-slate-600 mb-1">結婚日期</label>
          <Input
            id="person-marriageDate"
            type="date"
            value={person.marriageDate || ''}
            onChange={e => update({ marriageDate: e.target.value || undefined })}
          />
        </div>

        <div>
          <label htmlFor="person-divorceDate" className="block text-sm text-slate-600 mb-1">離婚日期</label>
          <Input
            id="person-divorceDate"
            type="date"
            value={person.divorceDate || ''}
            onChange={e => update({ divorceDate: e.target.value || undefined })}
          />
        </div>

        {person.relation !== '配偶' && (
          <div className="border-t border-slate-200 pt-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              此人的親屬
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => dispatch({
                  type: 'ADD_SUB_HEIR',
                  payload: { parentId: person.id, relation: '子女' },
                })}
              >
                + 新增子女
              </Button>
              <Button
                onClick={() => dispatch({
                  type: 'ADD_SUB_HEIR',
                  payload: { parentId: person.id, relation: '子女之配偶' },
                })}
                disabled={state.persons.some(
                  p => p.parentId === person.id && p.relation === '子女之配偶' && !p.divorceDate
                )}
              >
                + 新增配偶
              </Button>
            </div>
          </div>
        )}

        <Button
          variant="danger"
          className="w-full mt-2"
          onClick={() => {
            const descendantCount = countDescendants(person.id, state.persons);
            if (descendantCount > 0) {
              if (!window.confirm(`刪除「${person.name || '(未命名)'}」將同時刪除其下 ${descendantCount} 位繼承人，是否確定？`)) return;
            }
            dispatch({ type: 'DELETE_PERSON', payload: { id: person.id } });
          }}
        >
          刪除此繼承人
        </Button>
      </div>
    </section>
  );
}
