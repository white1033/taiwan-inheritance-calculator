import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { InheritanceStatus, Relation } from '../types/models.ts';
import type { Fraction } from '../lib/fraction.ts';
import { toString } from '../lib/fraction.ts';

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
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onContextMenu?: (id: string, isDecedent: boolean, event: React.MouseEvent) => void;
  onAddChild?: (id: string) => void;
  onAddSpouse?: (id: string) => void;
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
      className={`bg-white rounded-lg shadow-md border-t-4 ${colorClass} ${ringClass} w-52 cursor-pointer relative group`}
      onClick={() => data.onSelect?.(id)}
      onContextMenu={(e) => { e.preventDefault(); data.onContextMenu?.(id, !!data.isDecedent, e); }}
      tabIndex={0}
      role="button"
      aria-label={`${data.isDecedent ? '被繼承人' : data.relation} ${data.name || '(未命名)'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          data.onSelect?.(id);
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && !data.isDecedent) {
          e.preventDefault();
          data.onDelete?.(id);
        }
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />

      {!data.isDecedent && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onDelete?.(id);
          }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
            <span className="text-xs bg-red-100 text-red-600 px-1 rounded">
              拋棄
            </span>
          )}
          {data.status === '代位繼承' && (
            <span className="text-xs bg-emerald-100 text-emerald-600 px-1 rounded">
              代位
            </span>
          )}
          {data.status === '再轉繼承' && (
            <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">
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
        <div>出生：{formatDate(data.birthDate)}</div>
        <div>死亡：{formatDate(data.deathDate)}</div>
        <div>結婚：{formatDate(data.marriageDate)}</div>
        <div>離婚：{formatDate(data.divorceDate)}</div>
      </div>

      {!data.isDecedent && data.inheritanceShare && (
        <div className="px-3 py-2 border-t border-slate-100 text-xs">
          <div className="text-blue-600 font-mono font-semibold">
            應繼分 {toString(data.inheritanceShare)}
          </div>
          {data.estateAmount != null && data.estateAmount > 0 && data.inheritanceShare && (
            <div className="text-slate-600 font-mono text-xs">
              約 {Math.round(data.estateAmount * data.inheritanceShare.n / data.inheritanceShare.d).toLocaleString()} 元
            </div>
          )}
          {data.reservedShare && (
            <div className="text-slate-400 font-mono">
              特留分 {toString(data.reservedShare)}
            </div>
          )}
        </div>
      )}

      {!data.isDecedent && data.relation !== '子女之配偶' && data.relation !== '配偶' && (
        <div className="flex justify-center gap-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); data.onAddChild?.(id); }}
            className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
            title="新增子女"
            aria-label="新增子女"
          >
            +子女
          </button>
          {!data.hasCurrentSpouse && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); data.onAddSpouse?.(id); }}
              className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100"
              title="新增配偶"
              aria-label="新增配偶"
            >
              +配偶
            </button>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400"
      />
    </div>
  );
});
