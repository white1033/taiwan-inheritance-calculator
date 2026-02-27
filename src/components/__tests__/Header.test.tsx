import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';
import { InheritanceProvider } from '../../context/InheritanceContext';
import { ToastProvider } from '../Toast';

vi.mock('../../lib/url-state', () => ({
  buildShareUrl: vi.fn().mockResolvedValue('https://example.com/#mock'),
  readHashState: vi.fn().mockResolvedValue(null),
}));

function renderHeader(props: Partial<Parameters<typeof Header>[0]> = {}) {
  return render(
    <InheritanceProvider>
      <ToastProvider>
        <Header onTogglePanel={() => {}} {...props} />
      </ToastProvider>
    </InheritanceProvider>,
  );
}

describe('Header', () => {
  it('renders title', () => {
    renderHeader();
    expect(screen.getByText('繼承系統表計算工具')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    renderHeader();
    expect(screen.getByText(/依據台灣民法繼承編/)).toBeInTheDocument();
  });

  it('calls onTogglePanel when hamburger button is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    renderHeader({ onTogglePanel: onToggle });

    const button = screen.getByRole('button', { name: 'Toggle panel' });
    await user.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('shows export dropdown when export button is clicked', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: '匯出' }));
    expect(screen.getByText('列印')).toBeInTheDocument();
    expect(screen.getByText('Excel 匯出')).toBeInTheDocument();
    expect(screen.getByText('繼承系統圖')).toBeInTheDocument();
    expect(screen.getByText('複製分享連結')).toBeInTheDocument();
  });

  it('hides export dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole('button', { name: '匯出' }));
    expect(screen.getByText('列印')).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByText('列印')).not.toBeInTheDocument();
  });
});
