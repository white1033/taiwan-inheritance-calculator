# Grandchild Inheritance Bug Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix bug where grandchildren with `parentId` and status `一般繼承` are incorrectly treated as direct heirs in the inheritance calculation.

**Architecture:** Three-layer defense — calculation engine ignores invalid grandchild slots, validation reports errors for illegal state, UI prevents creating the illegal state. Preset data is also corrected. TDD: failing tests first, then minimal fix.

**Tech Stack:** TypeScript, Vitest, React (PersonNode component)

---

### Task 1: Write failing test for calculation engine

**Files:**
- Modify: `src/lib/__tests__/inheritance.test.ts` (append new describe block after line 636)

**Step 1: Write the failing test**

Add this test block at the end of the top-level `describe('calculateShares', ...)`:

```typescript
describe('Grandchild with living parent should not inherit', () => {
  it('grandchild with parentId + 一般繼承 gets zero share', () => {
    // 配偶 + 子女A(活) + 子女B(活) + 孫(一般繼承, parentId→A)
    // 孫 should NOT count as a slot — only 配偶 + A + B = 3 slots
    const persons: Person[] = [
      { id: '1', name: '配偶', relation: '配偶', status: '一般繼承' },
      { id: '2', name: '子女A', relation: '子女', status: '一般繼承' },
      { id: '3', name: '子女B', relation: '子女', status: '一般繼承' },
      { id: '4', name: '孫', relation: '子女', status: '一般繼承', parentId: '2' },
    ];
    const results = calculateShares(decedent, persons);
    expectShare(results, '配偶', 1, 3);
    expectShare(results, '子女A', 1, 3);
    expectShare(results, '子女B', 1, 3);
    expectShare(results, '孫', 0, 1);
  });

  it('multiple grandchildren with parentId + 一般繼承 all get zero', () => {
    // No spouse, 2 children alive, 2 grandchildren under child A
    const persons: Person[] = [
      { id: '1', name: '子女A', relation: '子女', status: '一般繼承' },
      { id: '2', name: '子女B', relation: '子女', status: '一般繼承' },
      { id: '3', name: '孫1', relation: '子女', status: '一般繼承', parentId: '1' },
      { id: '4', name: '孫2', relation: '子女', status: '一般繼承', parentId: '1' },
    ];
    const results = calculateShares(decedent, persons);
    expectShare(results, '子女A', 1, 2);
    expectShare(results, '子女B', 1, 2);
    expectShare(results, '孫1', 0, 1);
    expectShare(results, '孫2', 0, 1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/inheritance.test.ts`

Expected: FAIL — the grandchild currently gets a non-zero share (1/4 instead of 0).

---

### Task 2: Fix calculation engine to exclude invalid grandchildren

**Files:**
- Modify: `src/lib/inheritance.ts:81-86` (in `determineActiveOrder`)
- Modify: `src/lib/inheritance.ts:158-163` (in `slotHolders` filter)

**Step 3: Add filter in `determineActiveOrder`**

In `src/lib/inheritance.ts`, inside `determineActiveOrder`, the filter at line 81-86 currently has:

```typescript
if (p.status === '代位繼承' || (p.status === '再轉繼承' && p.parentId)) return false;
```

Replace with:

```typescript
if (p.status === '代位繼承' || (p.status === '再轉繼承' && p.parentId)) return false;
// Exclude persons with parentId who are not 代位/再轉 sub-heirs (e.g. grandchildren with 一般繼承)
if (p.parentId && p.status !== '代位繼承' && p.status !== '再轉繼承') return false;
```

**Step 4: Add filter in `slotHolders`**

In the same file, the `slotHolders` filter (around line 158-163) currently has:

```typescript
if (p.status === '代位繼承') return false;
if (p.status === '再轉繼承' && p.parentId) return false;
```

Add after these two lines:

```typescript
// Exclude persons with parentId who are not 代位/再轉 sub-heirs
if (p.parentId && p.status !== '代位繼承' && p.status !== '再轉繼承') return false;
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/inheritance.test.ts`

Expected: ALL PASS including the two new tests.

**Step 6: Commit**

```bash
git add src/lib/__tests__/inheritance.test.ts src/lib/inheritance.ts
git commit -m "fix: exclude grandchildren with 一般繼承 from inheritance slots

Grandchildren (persons with parentId) who are not 代位繼承 or 再轉繼承
should not be treated as direct heir slots. Fixes incorrect share
calculation where grandchildren of living heirs received shares."
```

---

### Task 3: Write failing test for validation

**Files:**
- Modify: `src/lib/__tests__/validation.test.ts` (append new test)

**Step 7: Write the failing validation test**

Add at the end of the `describe('validate', ...)` block:

```typescript
it('errors when 子女 with 一般繼承 has parentId', () => {
  const persons: Person[] = [
    { id: '1', name: '子女A', relation: '子女', status: '一般繼承' },
    { id: '2', name: '孫', relation: '子女', status: '一般繼承', parentId: '1' },
  ];
  const errors = validate(persons, decedent);
  expect(hasError(errors, '2', 'status')).toBe(true);
});
```

**Step 8: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/validation.test.ts`

Expected: FAIL — validation currently does not flag this case.

---

### Task 4: Fix validation to catch invalid grandchild status

**Files:**
- Modify: `src/lib/validation.ts` (add rule inside the `for` loop, after the existing `子女之配偶` check around line 90)

**Step 9: Add validation rule**

After the `子女之配偶` check (line 88-90), add:

```typescript
// 子女 with parentId must be 代位繼承 or 再轉繼承 (not 一般繼承/拋棄繼承)
if (p.relation === '子女' && p.parentId && p.status !== '代位繼承' && p.status !== '再轉繼承') {
  errors.push({ personId: p.id, field: 'status', message: '子女有上層繼承人時，狀態須為代位繼承或再轉繼承' });
}
```

**Step 10: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/validation.test.ts`

Expected: ALL PASS.

**Step 11: Commit**

```bash
git add src/lib/__tests__/validation.test.ts src/lib/validation.ts
git commit -m "fix: validate that grandchildren must be 代位 or 再轉 status

Children with a parentId (grandchildren of decedent) must have status
代位繼承 or 再轉繼承. Flag 一般繼承 grandchildren as validation errors."
```

---

### Task 5: Fix preset data

**Files:**
- Modify: `src/lib/presets.ts:653-660` (remove preset_16_5 葉小明)

**Step 12: Remove 葉小明 from preset_16**

In `src/lib/presets.ts`, delete the object for `preset_16_5` (葉小明):

```typescript
// DELETE this entire object:
{
  id: 'preset_16_5',
  name: '葉小明',
  relation: '子女',
  status: '一般繼承',
  birthDate: '2015-01-10',
  parentId: 'preset_16_2',
},
```

**Step 13: Run all preset tests**

Run: `npx vitest run src/lib/__tests__/presets.test.ts`

Expected: ALL PASS — all presets calculate without invariant violation and shares sum to 1.

**Step 14: Commit**

```bash
git add src/lib/presets.ts
git commit -m "fix: remove invalid grandchild from preset_16

Remove 葉小明 (preset_16_5) who was a grandchild with 一般繼承 status,
which is an invalid state. This preset demonstrates spouse divorce/remarriage,
not grandchild inheritance."
```

---

### Task 6: Fix UI — restrict +子女 button visibility

**Files:**
- Modify: `src/components/PersonNode.tsx:173` (change button visibility condition)

**Step 15: Update button condition**

In `PersonNode.tsx`, line 173, change:

```tsx
{!data.isDecedent && data.relation === '子女' && data.status !== '死亡絕嗣' && (
```

To:

```tsx
{!data.isDecedent && data.relation === '子女' && (data.status === '死亡' || data.status === '再轉繼承') && (
```

**Step 16: Run full test suite**

Run: `npm run test:run`

Expected: ALL PASS.

**Step 17: Commit**

```bash
git add src/components/PersonNode.tsx
git commit -m "fix: only show +子女 button for dead or re-transfer heirs

Living heirs (一般繼承) and renounced heirs (拋棄繼承) cannot have
grandchildren who inherit. Restrict the button to 死亡 and 再轉繼承."
```

---

### Task 7: Final verification

**Step 18: Run full build + tests**

Run: `npm run build && npm run test:run`

Expected: Build succeeds with no TypeScript errors, all tests pass.
