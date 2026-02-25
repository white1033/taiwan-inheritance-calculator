import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
import { PersonNode, type PersonNodeData } from '../PersonNode';
import { TreeActionsContext, type TreeActions } from '../../context/TreeActionsContext';

const mockActions: TreeActions = {
  onSelect: vi.fn(),
  onDelete: vi.fn(),
  onContextMenu: vi.fn(),
  onAddChild: vi.fn(),
  onAddSpouse: vi.fn(),
};

const baseData: PersonNodeData = {
  name: '王小明',
  relation: '子女',
  status: '一般繼承',
  isDecedent: false,
  isSelected: false,
};

function renderNode(data: Partial<PersonNodeData> = {}) {
  const fullData = { ...baseData, ...data };
  return render(
    <ReactFlowProvider>
      <TreeActionsContext.Provider value={mockActions}>
        <PersonNode
          id="test-node"
          data={fullData}
          type="person"
          positionAbsoluteX={0}
          positionAbsoluteY={0}
          dragging={false}
          selectable={true}
          deletable={true}
          selected={false}
          isConnectable={true}
          zIndex={0}
          parentId={undefined}
          dragHandle={undefined}
          sourcePosition={undefined}
          targetPosition={undefined}
          width={undefined}
          height={undefined}
          draggable={true}
        />
      </TreeActionsContext.Provider>
    </ReactFlowProvider>,
  );
}

describe('PersonNode', () => {
  it('renders person name', () => {
    renderNode();
    expect(screen.getByText('王小明')).toBeInTheDocument();
  });

  it('renders relation label', () => {
    renderNode();
    expect(screen.getByText('子女')).toBeInTheDocument();
  });

  it('renders unnamed placeholder when name is empty', () => {
    renderNode({ name: '' });
    expect(screen.getByText('(未命名)')).toBeInTheDocument();
  });

  it('shows 拋棄 badge for 拋棄繼承 status', () => {
    renderNode({ status: '拋棄繼承' });
    expect(screen.getByText('拋棄')).toBeInTheDocument();
  });

  it('shows 代位 badge for 代位繼承 status', () => {
    renderNode({ status: '代位繼承' });
    expect(screen.getByText('代位')).toBeInTheDocument();
  });

  it('shows 再轉 badge for 再轉繼承 status', () => {
    renderNode({ status: '再轉繼承' });
    expect(screen.getByText('再轉')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const user = userEvent.setup();
    renderNode();

    const node = screen.getByRole('group');
    await user.click(node);
    expect(mockActions.onSelect).toHaveBeenCalledWith('test-node');
  });

  it('renders 被繼承人 label for decedent', () => {
    renderNode({ isDecedent: true });
    expect(screen.getByText('被繼承人')).toBeInTheDocument();
  });

  it('hides delete button for decedent', () => {
    renderNode({ isDecedent: true });
    expect(screen.queryByLabelText('刪除')).not.toBeInTheDocument();
  });
});
