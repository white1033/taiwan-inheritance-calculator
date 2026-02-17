import { useCallback, useMemo } from 'react';
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

const nodeTypes: NodeTypes = {
  person: PersonNode,
};

export function FamilyTree() {
  const { state, dispatch } = useInheritance();

  const onSelect = useCallback(
    (id: string) => dispatch({ type: 'SELECT_PERSON', payload: { id } }),
    [dispatch],
  );

  const onDelete = useCallback(
    (id: string) => dispatch({ type: 'DELETE_PERSON', payload: { id } }),
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
      ),
    [
      state.decedent,
      state.persons,
      state.results,
      state.selectedPersonId,
      onSelect,
      onDelete,
      state.validationErrors,
    ],
  );

  return (
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
  );
}
