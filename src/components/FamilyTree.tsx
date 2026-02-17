import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useInheritance } from '../context/InheritanceContext.tsx';
import { PersonNode } from './PersonNode.tsx';
import { buildTreeLayout } from '../lib/tree-layout.ts';
import { NodeContextMenu } from './NodeContextMenu.tsx';

const nodeTypes: NodeTypes = {
  person: PersonNode,
};

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
      function countDescendants(personId: string): number {
        const children = state.persons.filter(p => p.parentId === personId);
        return children.reduce((sum, c) => sum + 1 + countDescendants(c.id), 0);
      }
      const descendantCount = countDescendants(id);
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

  const { nodes, edges } = useMemo(
    () =>
      buildTreeLayout(
        state.decedent,
        state.persons,
        state.results,
        state.selectedPersonId,
        onSelect,
        onDelete,
        state.validationErrors,
        onContextMenu,
        onAddChild,
        onAddSpouse,
      ),
    [
      state.decedent,
      state.persons,
      state.results,
      state.selectedPersonId,
      onSelect,
      onDelete,
      state.validationErrors,
      onContextMenu,
      onAddChild,
      onAddSpouse,
    ],
  );

  const hasCurrentSpouseForContextPerson = contextMenu
    ? state.persons.some(
        p => p.parentId === contextMenu.personId && p.relation === '子女之配偶' && !p.divorceDate
      )
    : false;

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          personId={contextMenu.personId}
          isDecedent={contextMenu.isDecedent}
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
