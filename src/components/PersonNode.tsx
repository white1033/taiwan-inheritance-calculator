import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { InheritanceStatus, Relation } from '../types/models.ts';
import type { Fraction } from '../lib/fraction.ts';
import { toString, toPercent } from '../lib/fraction.ts';
import { useTreeActions } from '../context/TreeActionsContext.tsx';

export interface PersonNodeData extends Record<string, unknown> {
  name: string;
  relation: Relation;
  status: InheritanceStatus;
  birthDate?: string;
  deathDate?: string;
  marriageDate?: string;
  divorceDate?: string;
  inheritanceShare?: Fraction;
  reservedShare?: Fraction;
  isDecedent?: boolean;
  estateAmount?: number;
  isSelected?: boolean;
  hasErrors?: boolean;
  hasCurrentSpouse?: boolean;
}

export type PersonNodeType = Node<PersonNodeData, 'person'>;

const STATUS_COLORS: Record<InheritanceStatus | 'decedent', string> = {
  '一般繼承': 'border-t-green-500',
  '死亡': 'border-t-gray-400',
  '死亡絕嗣': 'border-t-gray-400',
  '拋棄繼承': 'border-t-red-500',
  '代位繼承': 'border-t-emerald-400',
  '再轉繼承': 'border-t-orange-400',
  decedent: 'border-t-slate-700',
};

function formatDate(d?: string): string {
  return d || '\u2014';
}

export const PersonNode = memo(function PersonNode({
  id,
  data,
}: NodeProps<PersonNodeType>) {
  const { onSelect, onDelete, onContextMenu, onAddChild, onAddSpouse } = useTreeActions();

  const colorClass = data.isDecedent
    ? STATUS_COLORS.decedent
    : STATUS_COLORS[data.status];
  const ringClass = data.isSelected
    ? 'ring-2 ring-blue-500'
    : data.hasErrors
      ? 'ring-2 ring-red-400'
      : '';

  return (
    <div
      className={`rounded-lg shadow-md border border-slate-200 border-t-4 ${colorClass} ${ringClass} ${data.isDecedent ? 'bg-slate-50 w-60' : 'bg-white w-52'} cursor-pointer relative group`}
      onClick={() => onSelect(id)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(id, !!data.isDecedent, e); }}
      tabIndex={0}
      role="group"
      aria-label={`${data.isDecedent ? '被繼承人' : data.relation} ${data.name || '(未命名)'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(id);
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && !data.isDecedent) {
          e.preventDefault();
          onDelete(id);
        }
      }}
    >
      <Handle type="target" position={Position.Top} id="top" className="!bg-slate-400" />
      <Handle type="target" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" style={{ top: 40 }} />
      <Handle type="target" position={Position.Left} id="left-in" className="!bg-transparent !border-0 !w-0 !h-0" style={{ top: 40 }} />

      {!data.isDecedent && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          aria-label="刪除"
        >
          ×
        </button>
      )}

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-500">
            {data.isDecedent ? '被繼承人' : data.relation}
          </span>
          {data.status === '拋棄繼承' && (
            <span className="text-xs bg-red-100 text-red-600 px-1 rounded cursor-help" title="拋棄繼承：繼承人拋棄繼承權，不參與遺產分配">
              拋棄
            </span>
          )}
          {data.status === '代位繼承' && (
            <span className="text-xs bg-emerald-100 text-emerald-600 px-1 rounded cursor-help" title="代位繼承（民法§1140）：直系血親卑親屬於繼承開始前死亡或喪失繼承權，由其直系血親卑親屬代位繼承">
              代位
            </span>
          )}
          {data.status === '再轉繼承' && (
            <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded cursor-help" title="再轉繼承：繼承人於繼承開始後、分割遺產前死亡，其應繼分轉由其繼承人繼承">
              再轉
            </span>
          )}
        </div>
        <div
          className={`font-semibold text-sm ${data.status === '拋棄繼承' ? 'line-through text-slate-400' : 'text-slate-800'}`}
        >
          {data.name || '(未命名)'}
        </div>
      </div>

      <div className="px-3 py-1 border-t border-slate-100 text-xs text-slate-500 space-y-0.5">
        {data.isDecedent ? (
          <>
            <div>死亡：{formatDate(data.deathDate)}</div>
            {data.estateAmount != null && data.estateAmount > 0 && (
              <div className="text-slate-700 font-semibold">
                遺產：{data.estateAmount.toLocaleString()} 元
              </div>
            )}
          </>
        ) : (
          <>
            <div>出生：{formatDate(data.birthDate)}</div>
            <div>死亡：{formatDate(data.deathDate)}</div>
            <div>結婚：{formatDate(data.marriageDate)}</div>
            <div>離婚：{formatDate(data.divorceDate)}</div>
          </>
        )}
      </div>

      {!data.isDecedent && data.inheritanceShare && (
        <div className="px-3 py-2 border-t border-slate-100 text-xs">
          <div className="text-blue-600 font-mono font-semibold" title="應繼分：依法律規定各繼承人應得之遺產比例">
            應繼分 {toString(data.inheritanceShare)}{' '}
            <span className="text-blue-400 font-normal">({toPercent(data.inheritanceShare)})</span>
          </div>
          {data.estateAmount != null && data.estateAmount > 0 && data.inheritanceShare && (
            <div className="text-slate-600 font-mono text-xs">
              約 {Math.round(data.estateAmount * data.inheritanceShare.n / data.inheritanceShare.d).toLocaleString()} 元
            </div>
          )}
          {data.reservedShare && (
            <div className="text-slate-500 font-mono" title="特留分（民法§1223）：繼承人依法保留之最低遺產比例，不得以遺囑剝奪">
              特留分 {toString(data.reservedShare)}
            </div>
          )}
        </div>
      )}

      {!data.isDecedent && data.relation === '子女' && (
        <div className="flex justify-center gap-1 py-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddChild(id); }}
            className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
            title="新增子女"
            aria-label="新增子女"
          >
            +子女
          </button>
          {!data.hasCurrentSpouse && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAddSpouse(id); }}
              className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100"
              title="新增配偶"
              aria-label="新增配偶"
            >
              +配偶
            </button>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" style={{ top: 40 }} />
      <Handle type="source" position={Position.Right} id="right-out" className="!bg-transparent !border-0 !w-0 !h-0" style={{ top: 40 }} />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-slate-400"
      />
    </div>
  );
});
