# UI Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify PersonNode cards by hiding empty dates, and move the export toolbar into a Header dropdown menu.

**Architecture:** Two independent changes. Task 1 edits PersonNode rendering logic. Tasks 2-4 extract export logic into a custom hook, build a dropdown in Header, then remove the old toolbar from App.

**Tech Stack:** React, Tailwind CSS, Vitest, @testing-library/react

---

### Task 1: Simplify PersonNode — hide empty date fields

**Files:**
- Modify: `src/components/PersonNode.tsx:125-143`
- Modify: `src/components/__tests__/PersonNode.test.tsx`

**Step 1: Write tests for date display behavior**

Add to `src/components/__tests__/PersonNode.test.tsx`:

```tsx
it('hides date rows when values are empty (non-decedent)', () => {
  renderNode({ birthDate: undefined, deathDate: undefined, marriageDate: undefined, divorceDate: undefined });
  expect(screen.queryByText(/出生/)).not.toBeInTheDocument();
  expect(screen.queryByText(/死亡/)).not.toBeInTheDocument();
  expect(screen.queryByText(/結婚/)).not.toBeInTheDocument();
  expect(screen.queryByText(/離婚/)).not.toBeInTheDocument();
});

it('shows only date rows that have values', () => {
  renderNode({ birthDate: '1990-01-01', deathDate: undefined, marriageDate: '2015-06-01', divorceDate: undefined });
  expect(screen.getByText(/出生/)).toBeInTheDocument();
  expect(screen.queryByText(/死亡/)).not.toBeInTheDocument();
  expect(screen.getByText(/結婚/)).toBeInTheDocument();
  expect(screen.queryByText(/離婚/)).not.toBeInTheDocument();
});

it('always shows death date for decedent', () => {
  renderNode({ isDecedent: true, deathDate: undefined });
  expect(screen.getByText(/死亡/)).toBeInTheDocument();
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/PersonNode.test.tsx`
Expected: first two new tests FAIL (dates are always rendered currently)

**Step 3: Update PersonNode to conditionally render dates**

In `src/components/PersonNode.tsx`, replace the date section (lines 125-143) with:

```tsx
{data.isDecedent ? (
  <div className="px-3 py-1 border-t border-slate-100 text-xs text-slate-500 space-y-0.5">
    <div>死亡：{formatDate(data.deathDate)}</div>
    {data.estateAmount != null && data.estateAmount > 0 && (
      <div className="text-slate-700 font-semibold">
        遺產：{data.estateAmount.toLocaleString()} 元
      </div>
    )}
  </div>
) : (
  (() => {
    const dates: [string, string | undefined][] = [
      ['出生', data.birthDate],
      ['死亡', data.deathDate],
      ['結婚', data.marriageDate],
      ['離婚', data.divorceDate],
    ];
    const filled = dates.filter(([, v]) => v);
    if (filled.length === 0) return null;
    return (
      <div className="px-3 py-1 border-t border-slate-100 text-xs text-slate-500 space-y-0.5">
        {filled.map(([label, value]) => (
          <div key={label}>{label}：{value}</div>
        ))}
      </div>
    );
  })()
)}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/PersonNode.test.tsx`
Expected: ALL pass

**Step 5: Commit**

```bash
git add src/components/PersonNode.tsx src/components/__tests__/PersonNode.test.tsx
git commit -m "feat: hide empty date fields in PersonNode cards"
```

---

### Task 2: Extract export logic into useExport hook

**Files:**
- Create: `src/hooks/useExport.ts`
- Test: `src/components/__tests__/ExportToolbar.test.tsx` (existing tests still pass)

**Step 1: Create the hook**

Create `src/hooks/useExport.ts` extracting the logic from `ExportToolbar.tsx`:

```ts
import { useState } from 'react';
import { useInheritance } from './useInheritance';
import { exportToExcel } from '../lib/excel';
import { exportToPng, printPage } from '../lib/pdf-export';
import { useToast } from './useToast';
import { buildShareUrl } from '../lib/url-state';

export type ExportAction = 'print' | 'excel' | 'png' | null;

export function useExport() {
  const { state } = useInheritance();
  const { toast } = useToast();
  const hasErrors = state.validationErrors.length > 0;
  const [loadingAction, setLoadingAction] = useState<ExportAction>(null);

  async function guardedExport(action: ExportAction, fn: () => Promise<void>) {
    if (hasErrors) {
      toast('請先修正所有驗證錯誤後再匯出', 'error');
      return;
    }
    setLoadingAction(action);
    try {
      await fn();
    } finally {
      setLoadingAction(null);
    }
  }

  const handlePrint = () => guardedExport('print', () => printPage('family-tree'));

  const handleExcel = () => guardedExport('excel', async () => {
    try {
      await exportToExcel(state.decedent, state.persons);
    } catch (err) {
      toast('Excel 匯出失敗：' + (err instanceof Error ? err.message : '未知錯誤'), 'error');
    }
  });

  const handlePng = () => guardedExport('png', async () => {
    try {
      await exportToPng('family-tree', '繼承系統圖.png');
    } catch (err) {
      toast('圖片匯出失敗：' + (err instanceof Error ? err.message : '未知錯誤'), 'error');
    }
  });

  const handleShareLink = async () => {
    try {
      const url = await buildShareUrl(state.decedent, state.persons);
      await navigator.clipboard.writeText(url);
      toast('已複製分享連結到剪貼簿', 'success');
    } catch {
      toast('複製失敗，請手動複製', 'error');
    }
  };

  return { handlePrint, handleExcel, handlePng, handleShareLink, loadingAction, hasErrors };
}
```

**Step 2: Refactor ExportToolbar to use the hook**

Update `src/components/ExportToolbar.tsx` to use `useExport()` instead of inline logic. Keep the same JSX, just replace the local state/functions with the hook. This ensures existing tests still pass.

**Step 3: Run existing ExportToolbar tests**

Run: `npx vitest run src/components/__tests__/ExportToolbar.test.tsx`
Expected: ALL pass (behavior unchanged)

**Step 4: Commit**

```bash
git add src/hooks/useExport.ts src/components/ExportToolbar.tsx
git commit -m "refactor: extract export logic into useExport hook"
```

---

### Task 3: Add export dropdown to Header

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/components/__tests__/Header.test.tsx`

**Step 1: Write tests for the export dropdown**

Add to `src/components/__tests__/Header.test.tsx`. The Header now needs `InheritanceProvider` and `ToastProvider` wrappers since it uses `useExport`. Add a mock for url-state (same as ExportToolbar test).

```tsx
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/Header.test.tsx`
Expected: FAIL (no export button exists yet)

**Step 3: Implement export dropdown in Header**

Update `src/components/Header.tsx`: add `useExport` hook, `useState` for dropdown open/close, `useEffect` + `useRef` for click-outside-to-close. Add a dropdown button after undo/redo with the four export actions. Include the disclaimer as small text at the dropdown bottom.

Key implementation notes:
- Dropdown uses absolute positioning relative to the button container
- Click-outside uses a `mousedown` event listener on `document`
- Each menu item calls the corresponding `useExport` handler and closes the dropdown
- Spinner shows on the active loading action
- Items are disabled when `hasErrors` or `loadingAction` is active

**Step 4: Update existing Header tests to use the new wrapper**

The existing three tests need the `InheritanceProvider` + `ToastProvider` wrappers. Update them to use `renderHeader()`.

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/Header.test.tsx`
Expected: ALL pass

**Step 6: Commit**

```bash
git add src/components/Header.tsx src/components/__tests__/Header.test.tsx
git commit -m "feat: add export dropdown menu to Header"
```

---

### Task 4: Remove old ExportToolbar from App

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/components/ExportToolbar.tsx`
- Delete: `src/components/__tests__/ExportToolbar.test.tsx`

**Step 1: Remove ExportToolbar and disclaimer from App.tsx**

In `src/App.tsx`:
- Remove the `import { ExportToolbar }` line
- Remove `<ExportToolbar />` (line 43)
- Remove the disclaimer `<div>` (lines 44-46)

**Step 2: Delete old files**

```bash
rm src/components/ExportToolbar.tsx src/components/__tests__/ExportToolbar.test.tsx
```

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: ALL pass, no references to deleted files

**Step 4: Run build to verify no compile errors**

Run: `npm run build`
Expected: clean build

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove ExportToolbar, export actions now in Header dropdown"
```
