import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportToolbar } from '../ExportToolbar';
import { InheritanceProvider } from '../../context/InheritanceContext';
import { ToastProvider } from '../Toast';

vi.mock('../../lib/url-state', () => ({
  buildShareUrl: vi.fn().mockResolvedValue('https://example.com/#mock'),
  readHashState: vi.fn().mockResolvedValue(null),
}));

function renderToolbar() {
  return render(
    <InheritanceProvider>
      <ToastProvider>
        <ExportToolbar />
      </ToastProvider>
    </InheritanceProvider>,
  );
}

describe('ExportToolbar', () => {
  it('renders all export buttons', () => {
    renderToolbar();
    expect(screen.getByText('列印')).toBeInTheDocument();
    expect(screen.getByText('Excel 匯出')).toBeInTheDocument();
    expect(screen.getByText('Excel 匯入')).toBeInTheDocument();
    expect(screen.getByText('PDF 匯出')).toBeInTheDocument();
    expect(screen.getByText('繼承系統圖')).toBeInTheDocument();
    expect(screen.getByText('複製分享連結')).toBeInTheDocument();
  });

  it('renders import file input (hidden)', () => {
    renderToolbar();
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('hidden');
  });

  it('calls clipboard API when share link button is clicked', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    renderToolbar();

    await user.click(screen.getByText('複製分享連結'));
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
  });
});
