import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeftPanel } from '../LeftPanel';
import { InheritanceProvider } from '../../context/InheritanceContext';
import { ToastProvider } from '../Toast';

function renderLeftPanel(open = true) {
  const onClose = vi.fn();
  const result = render(
    <InheritanceProvider>
      <ToastProvider>
        <LeftPanel open={open} onClose={onClose} />
      </ToastProvider>
    </InheritanceProvider>,
  );
  return { ...result, onClose };
}

describe('LeftPanel', () => {
  it('renders section headers', () => {
    renderLeftPanel();
    expect(screen.getByText('範例案例')).toBeInTheDocument();
    expect(screen.getByText('被繼承人資訊')).toBeInTheDocument();
    expect(screen.getByText('新增繼承人')).toBeInTheDocument();
    expect(screen.getByText('計算結果')).toBeInTheDocument();
  });

  it('adds a heir when button is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderLeftPanel();

    const addChildBtn = screen.getByRole('button', { name: '+ 子女' });
    await user.click(addChildBtn);

    // After adding, the PersonEditor should appear
    expect(screen.getByText('編輯繼承人')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it('disables spouse button when spouse exists', async () => {
    const user = userEvent.setup();
    renderLeftPanel();

    const addSpouseBtn = screen.getByRole('button', { name: '+ 配偶' });
    expect(addSpouseBtn).not.toBeDisabled();

    await user.click(addSpouseBtn);

    // After adding spouse, the button should be disabled
    expect(screen.getByRole('button', { name: '+ 配偶' })).toBeDisabled();
  });

  it('loads a preset', async () => {
    const user = userEvent.setup();
    renderLeftPanel();

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '0');

    // After loading preset, results should appear (multiple heirs have shares)
    const shares = screen.getAllByText(/應繼分/);
    expect(shares.length).toBeGreaterThan(0);
  });

  it('shows preset description after selection', async () => {
    const user = userEvent.setup();
    renderLeftPanel();

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, '0');

    expect(screen.getByText(/最常見的繼承情形/)).toBeInTheDocument();
  });
});
