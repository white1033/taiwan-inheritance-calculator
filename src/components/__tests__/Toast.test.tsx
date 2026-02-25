import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, ToastContext } from '../Toast';
import { useContext } from 'react';

function ToastTrigger({ message, type }: { message: string; type?: 'info' | 'error' | 'success' }) {
  const ctx = useContext(ToastContext);
  return (
    <button onClick={() => ctx?.toast(message, type)}>
      Show Toast
    </button>
  );
}

describe('Toast', () => {
  it('renders toast message when triggered', async () => {
    const { getByText } = render(
      <ToastProvider>
        <ToastTrigger message="測試訊息" />
      </ToastProvider>,
    );

    act(() => {
      getByText('Show Toast').click();
    });

    expect(screen.getByRole('alert')).toHaveTextContent('測試訊息');
  });

  it('auto-dismisses toast after timeout', async () => {
    vi.useFakeTimers();

    const { getByText } = render(
      <ToastProvider>
        <ToastTrigger message="會消失" />
      </ToastProvider>,
    );

    act(() => {
      getByText('Show Toast').click();
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('renders error toast with error styling', () => {
    const { getByText } = render(
      <ToastProvider>
        <ToastTrigger message="錯誤訊息" type="error" />
      </ToastProvider>,
    );

    act(() => {
      getByText('Show Toast').click();
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('錯誤訊息');
    expect(alert.className).toContain('text-red-800');
  });
});
