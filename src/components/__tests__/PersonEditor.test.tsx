import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeftPanel } from '../LeftPanel';
import { InheritanceProvider } from '../../context/InheritanceContext';
import { ToastProvider } from '../Toast';

function renderWithAddedPerson() {
  return render(
    <InheritanceProvider>
      <ToastProvider>
        <LeftPanel open={true} onClose={() => {}} />
      </ToastProvider>
    </InheritanceProvider>,
  );
}

describe('PersonEditor', () => {
  it('shows editor when a person is added', async () => {
    const user = userEvent.setup();
    renderWithAddedPerson();

    await user.click(screen.getByRole('button', { name: '+ 子女' }));

    expect(screen.getByText('編輯繼承人')).toBeInTheDocument();
    // PersonEditor has its own name field with id="person-name"
    expect(document.getElementById('person-name')).toBeInTheDocument();
  });

  it('updates person name', async () => {
    const user = userEvent.setup();
    renderWithAddedPerson();

    await user.click(screen.getByRole('button', { name: '+ 子女' }));

    const nameInput = document.getElementById('person-name') as HTMLInputElement;
    await user.type(nameInput, '王小明');

    expect(nameInput).toHaveValue('王小明');
  });

  it('closes editor when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithAddedPerson();

    await user.click(screen.getByRole('button', { name: '+ 子女' }));
    expect(screen.getByText('編輯繼承人')).toBeInTheDocument();

    await user.click(screen.getByText('關閉'));
    expect(screen.queryByText('編輯繼承人')).not.toBeInTheDocument();
  });

  it('deletes person from editor', async () => {
    const user = userEvent.setup();
    renderWithAddedPerson();

    await user.click(screen.getByRole('button', { name: '+ 子女' }));
    expect(screen.getByText('編輯繼承人')).toBeInTheDocument();

    await user.click(screen.getByText('刪除此繼承人'));
    // Editor should close
    expect(screen.queryByText('編輯繼承人')).not.toBeInTheDocument();
  });

  it('shows 已婚（日期不詳）checkbox in PersonEditor', async () => {
    const user = userEvent.setup();
    renderWithAddedPerson();

    await user.click(screen.getByRole('button', { name: '+ 子女' }));

    expect(screen.getByLabelText('已婚（日期不詳）')).toBeInTheDocument();
  });

  it('checking 已婚 checkbox disables the marriage date input', async () => {
    const user = userEvent.setup();
    renderWithAddedPerson();

    await user.click(screen.getByRole('button', { name: '+ 子女' }));

    const dateInput = document.getElementById('person-marriageDate') as HTMLInputElement;
    const checkbox = screen.getByLabelText('已婚（日期不詳）') as HTMLInputElement;

    expect(dateInput.disabled).toBe(false);
    await user.click(checkbox);
    expect(dateInput.disabled).toBe(true);
  });

  it('unchecking 已婚 checkbox re-enables the marriage date input', async () => {
    const user = userEvent.setup();
    renderWithAddedPerson();

    await user.click(screen.getByRole('button', { name: '+ 子女' }));

    const dateInput = document.getElementById('person-marriageDate') as HTMLInputElement;
    const checkbox = screen.getByLabelText('已婚（日期不詳）') as HTMLInputElement;

    await user.click(checkbox);
    expect(dateInput.disabled).toBe(true);

    await user.click(checkbox);
    expect(dateInput.disabled).toBe(false);
  });
});
