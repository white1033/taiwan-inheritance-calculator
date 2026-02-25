import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';

describe('Header', () => {
  it('renders title', () => {
    render(<Header onTogglePanel={() => {}} />);
    expect(screen.getByText('繼承系統表計算工具')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<Header onTogglePanel={() => {}} />);
    expect(screen.getByText(/依據台灣民法繼承編/)).toBeInTheDocument();
  });

  it('calls onTogglePanel when hamburger button is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<Header onTogglePanel={onToggle} />);

    const button = screen.getByRole('button', { name: 'Toggle panel' });
    await user.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
