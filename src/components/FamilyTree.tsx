import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useInheritance } from '../hooks/useInheritance.ts';
import { PersonNode } from './PersonNode.tsx';
import { buildTreeLayout } from '../lib/tree-layout.ts';
import { countDescendants } from '../lib/person-utils.ts';
import { NodeContextMenu } from './NodeContextMenu.tsx';
import { TreeActionsContext, type TreeActions } from '../context/TreeActionsContext.tsx';
import { TreeLegend } from './TreeLegend.tsx';
import { FIT_VIEW_FOR_EXPORT_EVENT, type FitViewForExportDetail } from '../lib/export-events.ts';

const nodeTypes: NodeTypes = {
  person: PersonNode,
};

function PrintFitView() {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const handleBeforePrint = () => {
      void fitView({ padding: 0.2, duration: 0 });
    };
    const handleFitForExport = (event: Event) => {
      const detail = (event as CustomEvent<FitViewForExportDetail | undefined>).detail;
      void fitView({
        padding: detail?.padding ?? 0.2,
        duration: detail?.duration ?? 0,
      });
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener(FIT_VIEW_FOR_EXPORT_EVENT, handleFitForExport as EventListener);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener(FIT_VIEW_FOR_EXPORT_EVENT, handleFitForExport as EventListener);
    };
  }, [fitView]);
  return null;
}

export function FamilyTree() {
  const { state, dispatch } = useInheritance();

  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; personId: string; isDecedent: boolean;
  } | null>(null);

  const onSelect = useCallback(
    (id: string) => dispatch({ type: 'SELECT_PERSON', payload: { id } }),
    [dispatch],
  );

  const onDelete = useCallback(
    (id: string) => {
      const descendantCount = countDescendants(id, state.persons);
      const person = state.persons.find(p => p.id === id);
      const name = person?.name || '(未命名)';

      if (descendantCount > 0) {
        const confirmed = window.confirm(
          `刪除「${name}」將同時刪除其下 ${descendantCount} 位繼承人，是否確定？`
        );
        if (!confirmed) return;
      }

      dispatch({ type: 'DELETE_PERSON', payload: { id } });
    },
    [dispatch, state.persons],
  );

  const onContextMenu = useCallback(
    (personId: string, isDecedent: boolean, event: React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, personId, isDecedent });
    },
    [],
  );

  const onAddChild = useCallback(
    (parentId: string) => {
      dispatch({ type: 'ADD_SUB_HEIR', payload: { parentId, relation: '子女' } });
    },
    [dispatch],
  );

  const onAddSpouse = useCallback(
    (parentId: string) => {
      dispatch({ type: 'ADD_SUB_HEIR', payload: { parentId, relation: '子女之配偶' } });
    },
    [dispatch],
  );

  const treeActions = useMemo<TreeActions>(
    () => ({ onSelect, onDelete, onContextMenu, onAddChild, onAddSpouse }),
    [onSelect, onDelete, onContextMenu, onAddChild, onAddSpouse],
  );

  const { nodes, edges } = useMemo(
    () =>
      buildTreeLayout({
        decedent: state.decedent,
        persons: state.persons,
        results: state.results,
        selectedId: state.selectedPersonId,
        validationErrors: state.validationErrors,
      }),
    [
      state.decedent,
      state.persons,
      state.results,
      state.selectedPersonId,
      state.validationErrors,
    ],
  );

  const contextPerson = contextMenu
    ? state.persons.find(p => p.id === contextMenu.personId)
    : null;

  const hasCurrentSpouseForContextPerson = contextMenu
    ? state.persons.some(
        p => p.parentId === contextMenu.personId && p.relation === '子女之配偶' && !p.divorceDate && p.status !== '死亡'
      )
    : false;

  const showMobileHint = state.persons.length === 0;

  return (
    <>
      <TreeActionsContext.Provider value={treeActions}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls className="no-print" />
          <PrintFitView />
        </ReactFlow>
      </TreeActionsContext.Provider>
      <TreeLegend />
      {showMobileHint && (
        <>
          <div className="md:hidden absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none">
            <p className="bg-slate-800/80 text-white text-sm px-4 py-2 rounded-full">
              點擊左上角 ☰ 開始新增繼承人
            </p>
          </div>
          <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none">
            <div className="bg-white/90 border border-slate-200 shadow-lg rounded-xl p-6 text-center max-w-sm">
              <p className="text-slate-600 text-sm mb-2">
                從左側面板新增繼承人，或選擇範例案例快速開始
              </p>
              <p className="text-slate-400 text-xs">
                支援配偶、子女、父母、兄弟姊妹、祖父母等關係
              </p>
            </div>
          </div>
        </>
      )}
      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          personId={contextMenu.personId}
          isDecedent={contextMenu.isDecedent}
          isChild={contextPerson?.relation === '子女'}
          isDiedWithoutIssue={contextPerson?.status === '死亡絕嗣'}
          hasCurrentSpouse={hasCurrentSpouseForContextPerson}
          onAddChild={onAddChild}
          onAddSpouse={onAddSpouse}
          onEdit={onSelect}
          onDelete={onDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
