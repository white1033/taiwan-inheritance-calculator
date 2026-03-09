# 再轉繼承人配偶支援實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 讓 `配偶 + parentId` 成為真實的再轉繼承參與者，支援多層再轉繼承鏈，並以 `coParentId` 欄位提供視覺化分組。

**Architecture:** 移除「配偶不可有 parentId」的驗證限制，改為精確的父節點狀態驗證。計算引擎 `distributeShare` 擴充以納入在世配偶 sub-heir；`determineActiveOrder` / `slotHolders` 同步更新。UI 元件（PersonNode、PersonEditor、FamilyTree、tree-layout）對應調整按鈕條件和樹狀佈局。

**Tech Stack:** React, TypeScript, Vitest, ReactFlow

**Design Doc:** `docs/plans/2026-03-09-spouse-retransfer-inheritance-design.md`

---

### Task 1: 資料模型 — 新增 `coParentId` 欄位

**Files:**
- Modify: `src/types/models.ts:45-57`

**Step 1: 新增欄位**

在 `Person` interface 的 `parentId` 欄位之後加入：

```typescript
parentId?: string;
coParentId?: string; // 視覺用：指向配偶節點 id，表示共同生親關係（不影響計算）
```

**Step 2: 確認 build 通過**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/types/models.ts
git commit -m "feat: add coParentId field to Person for visual spouse grouping"
```

---

### Task 2: 驗證規則 — 允許配偶 sub-heir

**Files:**
- Modify: `src/lib/validation.ts:87-90`
- Test: `src/lib/__tests__/validation.test.ts`

**Step 1: 寫失敗測試**

在 `validation.test.ts` 最後的 `errors when root 配偶 has parentId` 測試（目前 line 238）**之後**加入：

```typescript
it('allows 配偶 sub-heir when parent is 再轉繼承', () => {
  const persons: Person[] = [
    { id: '1', name: '甲', relation: '子女', status: '再轉繼承', deathDate: '2024-01-01' },
    { id: '2', name: '配偶乙', relation: '配偶', status: '一般繼承', parentId: '1' },
  ];
  const errors = validate(persons, decedent);
  expect(hasError(errors, '2', 'parentId')).toBe(false);
  expect(hasError(errors, '2', 'status')).toBe(false);
});

it('errors when 配偶 sub-heir parent is not 再轉繼承', () => {
  const persons: Person[] = [
    { id: '1', name: '甲', relation: '子女', status: '一般繼承' },
    { id: '2', name: '配偶乙', relation: '配偶', status: '一般繼承', parentId: '1' },
  ];
  const errors = validate(persons, decedent);
  expect(hasError(errors, '2', 'parentId')).toBe(true);
});

it('errors when 配偶 sub-heir has invalid status (死亡絕嗣)', () => {
  const persons: Person[] = [
    { id: '1', name: '甲', relation: '子女', status: '再轉繼承', deathDate: '2024-01-01' },
    { id: '2', name: '配偶乙', relation: '配偶', status: '死亡絕嗣', parentId: '1', deathDate: '2024-06-01' },
  ];
  const errors = validate(persons, decedent);
  expect(hasError(errors, '2', 'status')).toBe(true);
});
```

**Step 2: 確認測試失敗**

Run: `npx vitest run src/lib/__tests__/validation.test.ts`
Expected: 3 new tests FAIL

**Step 3: 修改驗證邏輯**

在 `validation.ts` 中，找到目前 line 87-90（`根配偶不應有 parentId` 的區塊）：

```typescript
// 舊（移除整個區塊）：
if (p.relation === '配偶' && p.parentId) {
  errors.push({ personId: p.id, field: 'parentId', message: '配偶不可作為代位或再轉繼承人' });
}
```

改為：

```typescript
// 新：配偶可有 parentId，但限制父節點狀態和自身狀態
if (p.relation === '配偶' && p.parentId) {
  const parent = personMap.get(p.parentId);
  if (!parent || parent.status !== '再轉繼承') {
    errors.push({ personId: p.id, field: 'parentId', message: '配偶 sub-heir 的上層必須是再轉繼承狀態' });
  }
  const validSpouseSubStatuses: InheritanceStatus[] = ['一般繼承', '再轉繼承', '拋棄繼承'];
  if (!validSpouseSubStatuses.includes(p.status)) {
    errors.push({ personId: p.id, field: 'status', message: '再轉繼承人的配偶狀態只允許一般繼承、再轉繼承或拋棄繼承' });
  }
}
```

確認 `InheritanceStatus` 已 import（若無則加入）。

**Step 4: 確認測試通過**

Run: `npx vitest run src/lib/__tests__/validation.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/lib/validation.ts src/lib/__tests__/validation.test.ts
git commit -m "feat: allow 配偶 sub-heir when parent is 再轉繼承, with status restrictions"
```

---

### Task 3: 計算引擎 — distributeShare 納入配偶 sub-heir

**Files:**
- Test: `src/lib/__tests__/inheritance.test.ts`
- Modify: `src/lib/inheritance.ts`

**Step 1: 寫 4 個失敗測試**

在 `inheritance.test.ts` 最後加入新的 describe block（在最後一個 `describe` 結尾的 `}` 之後）：

```typescript
describe('配偶作為再轉繼承 sub-heir', () => {
  it('再轉繼承人有在世配偶：份額三等分', () => {
    const persons: Person[] = [
      { id: '1', name: '甲', relation: '子女', status: '再轉繼承', deathDate: '2024-01-01' },
      { id: '2', name: 'A', relation: '子女', status: '再轉繼承', parentId: '1' },
      { id: '3', name: 'B', relation: '子女', status: '再轉繼承', parentId: '1' },
      { id: '4', name: '配偶乙', relation: '配偶', status: '一般繼承', parentId: '1' },
    ];
    const results = calculateShares(decedent, persons);
    expectShare(results, '甲', 0, 1);
    expectShare(results, 'A', 1, 3);
    expectShare(results, 'B', 1, 3);
    expectShare(results, '配偶乙', 1, 3);
  });

  it('再轉繼承人的配偶也死亡：配偶份額再轉給其子女', () => {
    const persons: Person[] = [
      { id: '1', name: '甲', relation: '子女', status: '再轉繼承', deathDate: '2024-01-01' },
      { id: '2', name: 'A', relation: '子女', status: '再轉繼承', parentId: '1' },
      { id: '3', name: 'B', relation: '子女', status: '再轉繼承', parentId: '1' },
      { id: '4', name: '配偶乙', relation: '配偶', status: '再轉繼承', parentId: '1', deathDate: '2024-06-01' },
      { id: '5', name: 'C', relation: '子女', status: '再轉繼承', parentId: '4' },
      { id: '6', name: 'D', relation: '子女', status: '再轉繼承', parentId: '4' },
    ];
    const results = calculateShares(decedent, persons);
    expectShare(results, '甲', 0, 1);
    expectShare(results, 'A', 1, 3);
    expectShare(results, 'B', 1, 3);
    expectShare(results, '配偶乙', 0, 1);
    expectShare(results, 'C', 1, 6);
    expectShare(results, 'D', 1, 6);
  });

  it('配偶 sub-heir 拋棄繼承：份額由其他子女均分', () => {
    const persons: Person[] = [
      { id: '1', name: '甲', relation: '子女', status: '再轉繼承', deathDate: '2024-01-01' },
      { id: '2', name: 'A', relation: '子女', status: '再轉繼承', parentId: '1' },
      { id: '3', name: 'B', relation: '子女', status: '再轉繼承', parentId: '1' },
      { id: '4', name: '配偶乙', relation: '配偶', status: '拋棄繼承', parentId: '1' },
    ];
    const results = calculateShares(decedent, persons);
    expectShare(results, '配偶乙', 0, 1);
    expectShare(results, 'A', 1, 2);
    expectShare(results, 'B', 1, 2);
  });

  it('兄弟姊妹再轉繼承，僅有在世配偶：配偶取得全部份額', () => {
    // 被繼承人無子女、父母，只有兄弟姊妹丙（再轉繼承）
    const persons: Person[] = [
      { id: '1', name: '丙', relation: '兄弟姊妹', status: '再轉繼承', deathDate: '2024-01-01' },
      { id: '2', name: '配偶丁', relation: '配偶', status: '一般繼承', parentId: '1' },
    ];
    const results = calculateShares(decedent, persons);
    expectShare(results, '丙', 0, 1);
    expectShare(results, '配偶丁', 1, 1);
  });
});
```

**Step 2: 確認測試失敗**

Run: `npx vitest run src/lib/__tests__/inheritance.test.ts`
Expected: 4 new tests FAIL

**Step 3: 修改 `distributeShare`**

在 `inheritance.ts` 的 `distributeShare` 函式（約 line 323），在 `directSubHeirs` 定義之後、`deadIntermediates` 之前加入：

```typescript
// 再轉繼承時，也納入在世的配偶 sub-heir（status 一般繼承，非拋棄繼承）
const livingSpouseSubHeirs = status === '再轉繼承'
  ? persons.filter(
      p => p.relation === '配偶' &&
           p.parentId === parentId &&
           p.status === '一般繼承' &&
           !visited.has(p.id)
    )
  : [];
```

並更新 `allSubHeirs`：

```typescript
const allSubHeirs = [...directSubHeirs, ...livingSpouseSubHeirs, ...deadIntermediates];
```

**Step 4: 修改 `determineActiveOrder` 和 `slotHolders`（共 2 處）**

找到 `inheritance.ts` 中兩處 `persons.some(sub => sub.status === '再轉繼承' && sub.parentId === p.id)` 的判斷式，改為：

```typescript
persons.some(sub =>
  sub.parentId === p.id &&
  (sub.status === '再轉繼承' ||
   (sub.relation === '配偶' && sub.status === '一般繼承'))
)
```

（在 `determineActiveOrder` 約 line 107 和 `slotHolders` 約 line 178 各一處）

**Step 5: 確認測試通過**

Run: `npx vitest run src/lib/__tests__/inheritance.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/lib/inheritance.ts src/lib/__tests__/inheritance.test.ts
git commit -m "feat: distributeShare includes living spouse sub-heir for 再轉繼承"
```

---

### Task 4: Status Options — 配偶 sub-heir 可用狀態

**Files:**
- Modify: `src/lib/status-options.ts:12-24`

**Step 1: 更新 `computeAvailableStatuses`**

在 `status-options.ts` 的 `computeAvailableStatuses` 函式中，找到 `if (!person.parentId)` 區塊。

在此區塊的 **最前面**（`if (!person.parentId)` 之前）加入：

```typescript
// 配偶 sub-heir（parentId 存在）：只允許 一般繼承、再轉繼承、拋棄繼承
if (person.relation === '配偶' && person.parentId) {
  const options: InheritanceStatus[] = ['一般繼承', '再轉繼承', '拋棄繼承'];
  if (!options.includes(person.status)) {
    return [person.status, ...options];
  }
  return options;
}
```

同時更新 line 21-24 的 `配偶` 分支，移除舊的不支援說明注釋（「配偶 excluded since spouse re-transfer isn't supported in this calculator」）：

```typescript
// 舊
options = person.relation === '配偶'
  ? ['一般繼承', '死亡', '死亡絕嗣', '拋棄繼承']
  : ['一般繼承', '死亡', '死亡絕嗣', '拋棄繼承', '再轉繼承'];

// 不需修改，根配偶的可用狀態維持不變（root 配偶已不支援再轉繼承，此情境走 parentId 路徑）
```

**Step 2: 確認 build 通過**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/lib/status-options.ts
git commit -m "feat: restrict 配偶 sub-heir status to 一般繼承/再轉繼承/拋棄繼承"
```

---

### Task 5: Context — ADD_SUB_HEIR 配偶預設狀態

**Files:**
- Modify: `src/context/InheritanceContext.tsx:130-148`

**Step 1: 修改 ADD_SUB_HEIR 的狀態推導邏輯**

在 `InheritanceContext.tsx` 的 `ADD_SUB_HEIR` case（約 line 133-148）中，找到：

```typescript
let status: Person['status'] = '一般繼承';
// 子女之配偶僅供樹狀圖顯示，不參與繼承計算，一律使用一般繼承
if (action.payload.relation !== '子女之配偶' && parent) {
```

修改條件，讓 `配偶` relation 也保持 `一般繼承` 預設（在世配偶）：

```typescript
let status: Person['status'] = '一般繼承';
// 子女之配偶（顯示用）和 配偶 sub-heir（在世配偶預設一般繼承）一律不自動推狀態
if (action.payload.relation !== '子女之配偶' && action.payload.relation !== '配偶' && parent) {
```

**Step 2: 確認 build 通過**

Run: `npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add src/context/InheritanceContext.tsx
git commit -m "fix: 配偶 sub-heir defaults to 一般繼承 regardless of parent status"
```

---

### Task 6: PersonEditor — 配偶按鈕和 coParentId

**Files:**
- Modify: `src/components/PersonEditor.tsx:196-225`

**Step 1: 擴展「此人的親屬」區塊的顯示條件**

找到約 line 196-226 的條件：

```typescript
{((person.relation === '子女' && person.status !== '死亡絕嗣') ||
  (person.relation === '兄弟姊妹' && (person.status === '死亡' || person.status === '再轉繼承'))) && (
```

改為（所有 `再轉繼承` 狀態的人都顯示此區塊，包括 `配偶 + parentId`）：

```typescript
{(person.status === '再轉繼承' ||
  (person.relation === '子女' && person.status === '死亡') ||
  (person.relation === '兄弟姊妹' && person.status === '死亡')) && (
```

**Step 2: 修改「+ 新增配偶」按鈕**

找到約 line 211-223（`+ 新增配偶` 按鈕）：

```typescript
// 舊
{person.relation === '子女' && (
  <Button
    onClick={() => dispatch({
      type: 'ADD_SUB_HEIR',
      payload: { parentId: person.id, relation: '子女之配偶' },
    })}
    disabled={state.persons.some(
      p => p.parentId === person.id && p.relation === '子女之配偶' && !p.divorceDate && p.status !== '死亡'
    )}
  >
    + 新增配偶
  </Button>
)}
```

改為（`再轉繼承` 狀態才有配偶繼承的意義）：

```typescript
{person.status === '再轉繼承' && (
  <Button
    onClick={() => dispatch({
      type: 'ADD_SUB_HEIR',
      payload: { parentId: person.id, relation: '配偶' },
    })}
    disabled={state.persons.some(
      p => p.parentId === person.id && p.relation === '配偶' && p.status !== '拋棄繼承'
    )}
  >
    + 新增配偶
  </Button>
)}
```

**Step 3: 新增 `coParentId` 選填欄位**

在 PersonEditor 的欄位區塊末端（「此人的親屬」區塊之前），加入以下：當目前 person 的 parent 是 `再轉繼承`，且 person 自身不是 `配偶` 時，顯示生親配偶選單：

```typescript
{(() => {
  const parent = person.parentId ? state.persons.find(p => p.id === person.parentId) : null;
  if (!parent || parent.status !== '再轉繼承') return null;
  if (person.relation === '配偶') return null;
  // 同層的配偶 sub-heirs
  const siblingSpouses = state.persons.filter(
    p => p.parentId === person.parentId && p.relation === '配偶'
  );
  if (siblingSpouses.length === 0) return null;
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1">生親配偶（選填）</label>
      <Select
        value={person.coParentId ?? ''}
        onChange={e => dispatch({
          type: 'UPDATE_PERSON',
          payload: { id: person.id, coParentId: e.target.value || undefined },
        })}
      >
        <option value="">（不指定）</option>
        {siblingSpouses.map(sp => (
          <option key={sp.id} value={sp.id}>{sp.name || '(未命名配偶)'}</option>
        ))}
      </Select>
    </div>
  );
})()}
```

**Step 4: 確認 InheritanceContext 支援 `UPDATE_PERSON` 更新 `coParentId`**

在 `InheritanceContext.tsx` 中找到 `UPDATE_PERSON` case，確認它使用 spread（`...action.payload`）更新 person。若是，`coParentId` 自動支援，無需額外修改。

**Step 5: 確認 build 通過**

Run: `npm run build`
Expected: No TypeScript errors

**Step 6: Commit**

```bash
git add src/components/PersonEditor.tsx
git commit -m "feat: update PersonEditor spouse button and add coParentId field"
```

---

### Task 7: PersonNode — 擴展 hover 按鈕條件

**Files:**
- Modify: `src/components/PersonNode.tsx:173-198`

**Step 1: 修改按鈕顯示條件**

找到約 line 173-198 的 hover 按鈕區塊：

```typescript
// 舊條件（只有特定 relation 顯示）
{!data.isDecedent && (
  (data.relation === '子女' && (data.status === '死亡' || data.status === '再轉繼承' || data.status === '代位繼承')) ||
  (data.relation === '兄弟姊妹' && (data.status === '死亡' || data.status === '再轉繼承'))
) && (
```

改為（`再轉繼承` 狀態一律顯示，含 `配偶 + parentId`）：

```typescript
// 新條件
{!data.isDecedent && (
  data.status === '再轉繼承' ||
  (data.relation === '子女' && data.status === '死亡') ||
  (data.relation === '子女' && data.status === '代位繼承') ||
  (data.relation === '兄弟姊妹' && data.status === '死亡')
) && (
```

**Step 2: 更新 `+配偶` 按鈕條件**

找到 `+配偶` 按鈕（約 line 187-197）：

```typescript
// 舊：只有 子女 relation
{data.relation === '子女' && (data.status === '死亡' || data.status === '再轉繼承') && !data.hasCurrentSpouse && (
```

改為（所有 `再轉繼承` 狀態皆可新增配偶，但 `配偶 + parentId` 本身不再顯示此按鈕）：

```typescript
{data.status === '再轉繼承' && data.relation !== '配偶' && !data.hasCurrentSpouse && (
```

**Step 3: 確認 build 通過**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/components/PersonNode.tsx
git commit -m "feat: extend hover buttons to all 再轉繼承 status nodes"
```

---

### Task 8: FamilyTree — 更新 onAddSpouse

**Files:**
- Modify: `src/components/FamilyTree.tsx:94, 126-128`

**Step 1: 修改 `onAddSpouse` 動作**

找到 `FamilyTree.tsx` 約 line 94：

```typescript
// 舊
dispatch({ type: 'ADD_SUB_HEIR', payload: { parentId, relation: '子女之配偶' } });
// 新
dispatch({ type: 'ADD_SUB_HEIR', payload: { parentId, relation: '配偶' } });
```

**Step 2: 更新 `hasCurrentSpouseForContextPerson`**

找到約 line 126-128：

```typescript
// 舊
p => p.parentId === contextMenu.personId && p.relation === '子女之配偶' && !p.divorceDate && p.status !== '死亡'
// 新（配合 Task 6 的 disabled 邏輯，統一用 relation === '配偶' 且非拋棄）
p => p.parentId === contextMenu.personId && p.relation === '配偶' && p.status !== '拋棄繼承'
```

**Step 3: 確認 build 通過**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/components/FamilyTree.tsx
git commit -m "fix: onAddSpouse creates 配偶 sub-heir instead of 子女之配偶"
```

---

### Task 9: tree-layout — 支援配偶 sub-heir 佈局

**Files:**
- Modify: `src/lib/tree-layout.ts:39-43, 70-74, 84-86, 108-141`

**Step 1: 更新 `hasCurrentSpouse`（line 39-43）**

```typescript
// 舊
function hasCurrentSpouse(personId: string): boolean {
  return persons.some(
    (p) => p.parentId === personId && p.relation === '子女之配偶' && !p.divorceDate && p.status !== '死亡',
  );
}
// 新：也偵測 配偶 + parentId（非拋棄繼承即視為有配偶）
function hasCurrentSpouse(personId: string): boolean {
  return persons.some(
    (p) => p.parentId === personId &&
           (p.relation === '子女之配偶' || p.relation === '配偶') &&
           !p.divorceDate &&
           p.status !== '拋棄繼承',
  );
}
```

**Step 2: 更新 `getSpouseNodes`（line 70-74）**

```typescript
// 舊
function getSpouseNodes(personId: string): Person[] {
  return persons.filter(
    (p) => p.parentId === personId && p.relation === '子女之配偶',
  );
}
// 新：包含 配偶 + parentId
function getSpouseNodes(personId: string): Person[] {
  return persons.filter(
    (p) => p.parentId === personId && (p.relation === '子女之配偶' || p.relation === '配偶'),
  );
}
```

**Step 3: 更新 `subtreeWidth` 中的子女過濾（line 84-85）**

```typescript
// 舊
const childPersons = persons.filter(
  (p) => p.parentId === personId && p.relation !== '子女之配偶',
);
// 新：同時排除 配偶 sub-heir
const childPersons = persons.filter(
  (p) => p.parentId === personId && p.relation !== '子女之配偶' && p.relation !== '配偶',
);
```

**Step 4: 更新 `layoutSubtree` 中的子女過濾（line 138-141）**

找到 `layoutSubtree` 函式內的子女過濾：

```typescript
// 舊
const childPersons = persons.filter(
  (p) => p.parentId === personId && p.relation !== '子女之配偶',
);
// 新
const childPersons = persons.filter(
  (p) => p.parentId === personId && p.relation !== '子女之配偶' && p.relation !== '配偶',
);
```

**Step 5: 在 `layoutSubtree` 配偶佈局後遞迴展開配偶的子樹**

找到約 line 121-136（配偶節點的 `addPersonNode` 和 edge 建立）：

```typescript
sortedSpouses.forEach((sp, i) => {
  const spX = personCx - NODE_WIDTH / 2 - (i + 1) * (NODE_WIDTH + H_GAP);
  addPersonNode(sp, spX, y);
  const isFormer = !!sp.divorceDate || sp.status === '死亡';
  edges.push({ ... });
  // 新增：若配偶 sub-heir 有自己的子女，遞迴展開其子樹
  if (sp.relation === '配偶' && sp.parentId) {
    layoutSubtree(sp.id, spX + NODE_WIDTH / 2, y, depth + 1);
  }
});
```

**Step 6: 新增 `coParentId` 細虛線 edge**

在 `layoutSubtree` 函式末端（所有子女佈局完成後），加入：

```typescript
// coParentId 細虛線：從配偶節點連到其共同生親子女
for (const child of childPersons) {
  if (child.coParentId) {
    edges.push({
      id: `e-coparent-${child.coParentId}-${child.id}`,
      source: child.coParentId,
      target: child.id,
      type: 'straight',
      style: { stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3,3' },
      zIndex: -1,
    });
  }
}
```

**Step 7: 確認 build 通過**

Run: `npm run build`
Expected: No TypeScript errors

**Step 8: Commit**

```bash
git add src/lib/tree-layout.ts
git commit -m "feat: layout supports 配偶 sub-heir nodes and coParentId visual edges"
```

---

### Task 10: 全面驗證

**Files:**
- None (verification only)

**Step 1: 跑全部測試**

Run: `npx vitest run`
Expected: ALL PASS

**Step 2: Production build**

Run: `npm run build`
Expected: No errors

**Step 3: Lint**

Run: `npm run lint`
Expected: No errors

**Step 4: 手動驗證（dev server）**

Run: `npm run dev`

驗證以下流程：
1. 被繼承人 + 子女甲（一般繼承）→ 對甲設定 `再轉繼承` + 死亡日期 → 甲節點出現 `+配偶` 按鈕
2. 新增配偶乙 → 乙出現在甲左側，relation = 配偶，status = 一般繼承
3. 設定乙為 `再轉繼承` → 乙節點出現 `+子女` 按鈕 → 新增子女 C、D
4. 確認結果面板：甲 = 0，子女 A = 1/3，子女 B = 1/3，乙 = 0，C = 1/6，D = 1/6
5. 對子女 A 設定 `coParentId` → 細虛線從乙連到 A（暫不需要，若欄位顯示即可）
6. 確認兄弟姊妹設為 `再轉繼承` 時也出現 `+配偶` 按鈕

**Step 5: Final commit if needed**

若 lint 或手動測試發現小問題，修正後提交。
