# Sub-Heir Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable adding grandchildren, children's spouses, and unlimited-depth descendants to the inheritance tree, with recursive share calculation, recursive tree rendering, and three UI entry points (context menu, node button, editor panel).

**Architecture:** Expand existing `parentId` from "representation-only" to a universal family tree link. Add `'子女之配偶'` to the `Relation` type. Refactor tree layout and share calculation from flat/one-level to fully recursive. Add context menu and sub-heir buttons to the node and editor components.

**Tech Stack:** React, TypeScript, @xyflow/react, Vitest, Tailwind CSS

---

### Task 1: Expand Data Model — Add `'子女之配偶'` Relation

**Files:**
- Modify: `src/types/models.ts:11-20` (Relation type)
- Modify: `src/types/models.ts:23-40` (getOrder function)
- Modify: `src/types/models.ts:76-86` (RELATION_OPTIONS array)

**Step 1: Modify Relation type**

In `src/types/models.ts`, add `'子女之配偶'` to the `Relation` union type:

```typescript
export type Relation =
  | '配偶'
  | '子女'
  | '子女之配偶'
  | '父'
  | '母'
  | '兄弟姊妹'
  | '祖父'
  | '祖母'
  | '外祖父'
  | '外祖母';
```

**Step 2: Update getOrder function**

Add a case for `'子女之配偶'` — they don't belong to any inheritance order directly (their share comes from re-transfer), so return `null`:

```typescript
case '子女之配偶':
  return null; // participates via re-transfer, not direct order
```

**Step 3: Add to RELATION_OPTIONS**

Add `'子女之配偶'` after `'子女'` in the array:

```typescript
export const RELATION_OPTIONS: Relation[] = [
  '配偶',
  '子女',
  '子女之配偶',
  '父',
  // ... rest unchanged
];
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (exhaustive switch in getOrder now covers new value)

**Step 5: Commit**

```bash
git add src/types/models.ts
git commit -m "feat: add '子女之配偶' to Relation type for sub-heir support"
```

---

### Task 2: Expand Reducer — `ADD_SUB_HEIR` Action

**Files:**
- Modify: `src/context/InheritanceContext.tsx:14-20` (Action type)
- Modify: `src/context/InheritanceContext.tsx:41-93` (reducer function)

**Step 1: Add new Action type**

Add `ADD_SUB_HEIR` to the `Action` union:

```typescript
export type Action =
  | { type: 'SET_DECEDENT'; payload: Partial<Decedent> }
  | { type: 'ADD_PERSON'; payload: { relation: Relation } }
  | { type: 'ADD_SUB_HEIR'; payload: { parentId: string; relation: Relation } }
  | { type: 'UPDATE_PERSON'; payload: { id: string; updates: Partial<Person> } }
  | { type: 'DELETE_PERSON'; payload: { id: string } }
  | { type: 'SELECT_PERSON'; payload: { id: string | null } }
  | { type: 'LOAD_PERSONS'; payload: { decedent: Decedent; persons: Person[] } };
```

**Step 2: Add ADD_SUB_HEIR case to reducer**

Insert after the `ADD_PERSON` case. The new person's `parentId` is set to the target person, and the `status` is auto-inferred from the parent's status:

```typescript
case 'ADD_SUB_HEIR': {
  const parent = state.persons.find(p => p.id === action.payload.parentId);
  let status: Person['status'] = '一般繼承';
  if (parent) {
    if (parent.status === '死亡' || parent.status === '死亡絕嗣') {
      status = '代位繼承';
    } else if (parent.status === '再轉繼承') {
      status = '再轉繼承';
    }
  }
  const newPerson: Person = {
    id: generateId(),
    name: '',
    relation: action.payload.relation,
    status,
    parentId: action.payload.parentId,
  };
  const persons = [...state.persons, newPerson];
  return {
    ...state,
    persons,
    ...computeDerived(state.decedent, persons),
    selectedPersonId: newPerson.id,
  };
}
```

**Step 3: Update DELETE_PERSON for cascade delete**

Replace the current flat filter with recursive descendant collection:

```typescript
case 'DELETE_PERSON': {
  const idsToDelete = new Set<string>();
  function collectDescendants(id: string) {
    idsToDelete.add(id);
    for (const p of state.persons) {
      if (p.parentId === id && !idsToDelete.has(p.id)) {
        collectDescendants(p.id);
      }
    }
  }
  collectDescendants(action.payload.id);
  const persons = state.persons.filter(p => !idsToDelete.has(p.id));
  return {
    ...state,
    persons,
    ...computeDerived(state.decedent, persons),
    selectedPersonId:
      idsToDelete.has(state.selectedPersonId ?? '') ? null : state.selectedPersonId,
  };
}
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/context/InheritanceContext.tsx
git commit -m "feat: add ADD_SUB_HEIR action and cascade DELETE_PERSON"
```

---

### Task 3: Recursive Share Calculation — Tests First

**Files:**
- Modify: `src/lib/__tests__/inheritance.test.ts`

**Step 1: Add multi-level representation test**

Add a new `describe('Multi-level Representation (多代代位繼承)')` block:

```typescript
describe('Multi-level Representation (多代代位繼承)', () => {
  it('grandchild represents dead child, great-grandchild represents dead grandchild', () => {
    // 配偶 + 子女B(死亡) + 子女G
    // B has: 孫C(死亡, 代位) + 孫D(代位)
    // C has: 曾孫F(代位)
    // Slots: 配偶 + B + G = 3, each 1/3
    // B(0) → C(0) + D(1/6) → F gets C's 1/6
    const persons: Person[] = [
      { id: '1', name: '配偶', relation: '配偶', status: '一般繼承' },
      { id: '2', name: 'B', relation: '子女', status: '死亡', deathDate: '2023-01-01' },
      { id: '3', name: 'G', relation: '子女', status: '一般繼承' },
      { id: '4', name: 'C', relation: '子女', status: '代位繼承', parentId: '2', deathDate: '2023-02-01' },
      { id: '5', name: 'D', relation: '子女', status: '代位繼承', parentId: '2' },
      { id: '6', name: 'F', relation: '子女', status: '代位繼承', parentId: '4' },
    ];
    const results = calculateShares(decedent, persons);
    expectShare(results, '配偶', 1, 3);
    expectShare(results, 'B', 0, 1);
    expectShare(results, 'G', 1, 3);
    expectShare(results, 'C', 0, 1);
    expectShare(results, 'D', 1, 6);
    expectShare(results, 'F', 1, 6);
  });

  it('3 levels deep: child → grandchild → great-grandchild → great-great-grandchild', () => {
    // No spouse, child A(dead), grandchild B(dead, 代位 A), great-grandchild C(代位 B)
    // Only one slot (A), share = 1
    // A(0) → B(0) → C(1)
    const persons: Person[] = [
      { id: '1', name: 'A', relation: '子女', status: '死亡', deathDate: '2023-01-01' },
      { id: '2', name: 'B', relation: '子女', status: '代位繼承', parentId: '1', deathDate: '2023-02-01' },
      { id: '3', name: 'C', relation: '子女', status: '代位繼承', parentId: '2' },
    ];
    const results = calculateShares(decedent, persons);
    expectShare(results, 'A', 0, 1);
    expectShare(results, 'B', 0, 1);
    expectShare(results, 'C', 1, 1);
  });

  it('dead child with mixed sub-heirs: some alive, some dead with own sub-heirs', () => {
    // No spouse, 2 children: A(alive), B(dead)
    // B has: C(alive, 代位), D(dead, 代位)
    // D has: E(代位)
    // Slots: A + B = 2, each 1/2
    // B(0) → C(1/4), D(0) → E(1/4)
    const persons: Person[] = [
      { id: '1', name: 'A', relation: '子女', status: '一般繼承' },
      { id: '2', name: 'B', relation: '子女', status: '死亡', deathDate: '2023-01-01' },
      { id: '3', name: 'C', relation: '子女', status: '代位繼承', parentId: '2' },
      { id: '4', name: 'D', relation: '子女', status: '代位繼承', parentId: '2', deathDate: '2023-02-01' },
      { id: '5', name: 'E', relation: '子女', status: '代位繼承', parentId: '4' },
    ];
    const results = calculateShares(decedent, persons);
    expectShare(results, 'A', 1, 2);
    expectShare(results, 'B', 0, 1);
    expectShare(results, 'C', 1, 4);
    expectShare(results, 'D', 0, 1);
    expectShare(results, 'E', 1, 4);
  });
});
```

**Step 2: Add multi-level re-transfer test**

Add a new `describe('Multi-level Re-transfer (多層再轉繼承)')` block:

```typescript
describe('Multi-level Re-transfer (多層再轉繼承)', () => {
  it('re-transfer origin with sub-heirs who also die and re-transfer', () => {
    // No spouse, child A(alive), child B(再轉)
    // B has: B配偶(再轉), B子C(再轉, also dead → re-transfers to C子E)
    // Slots: A + B = 2, each 1/2
    // B(0) → B配偶(1/4), C(0) → E gets C's share
    // B's 1/2 split among B配偶 + C = 2 people → 1/4 each
    // C(0) re-transfers to E → E gets 1/4
    const persons: Person[] = [
      { id: '1', name: 'A', relation: '子女', status: '一般繼承' },
      { id: '2', name: 'B', relation: '子女', status: '再轉繼承', deathDate: '2024-03-01' },
      { id: '3', name: 'B配偶', relation: '子女之配偶', status: '再轉繼承', parentId: '2' },
      { id: '4', name: 'C', relation: '子女', status: '再轉繼承', parentId: '2', deathDate: '2024-06-01' },
      { id: '5', name: 'E', relation: '子女', status: '再轉繼承', parentId: '4' },
    ];
    const results = calculateShares(decedent, persons);
    expectShare(results, 'A', 1, 2);
    expectShare(results, 'B', 0, 1);
    expectShare(results, 'B配偶', 1, 4);
    expectShare(results, 'C', 0, 1);
    expectShare(results, 'E', 1, 4);
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/inheritance.test.ts`
Expected: New tests FAIL (current processSlotHolder doesn't recurse)

**Step 4: Commit failing tests**

```bash
git add src/lib/__tests__/inheritance.test.ts
git commit -m "test: add multi-level representation and re-transfer test cases"
```

---

### Task 4: Recursive Share Calculation — Implementation

**Files:**
- Modify: `src/lib/inheritance.ts:58-88` (determineActiveOrder)
- Modify: `src/lib/inheritance.ts:244-324` (processSlotHolder)

**Step 1: Make `determineActiveOrder` recursive**

The `hasActive` check needs to recursively check if a dead person has any living descendant (not just direct sub-heirs):

```typescript
function hasLivingDescendant(personId: string, persons: Person[]): boolean {
  const children = persons.filter(p => p.parentId === personId);
  for (const child of children) {
    if (child.status !== '拋棄繼承' && child.status !== '死亡' && child.status !== '死亡絕嗣') {
      return true;
    }
    if ((child.status === '死亡' || child.status === '死亡絕嗣') && hasLivingDescendant(child.id, persons)) {
      return true;
    }
  }
  return false;
}
```

Update `determineActiveOrder` to use it:

```typescript
const hasActive = orderPersons.some(p => {
  if (p.status === '拋棄繼承') return false;
  if (p.status === '死亡' || p.status === '死亡絕嗣') {
    return hasLivingDescendant(p.id, persons);
  }
  if (p.status === '再轉繼承' && !p.parentId) {
    return persons.some(sub => sub.parentId === p.id);
  }
  return true;
});
```

**Step 2: Make `slotHolders` filter recursive**

Update the filter for dead heirs to use `hasLivingDescendant`:

```typescript
if (p.status === '死亡' || p.status === '死亡絕嗣') {
  return hasLivingDescendant(p.id, persons);
}
```

**Step 3: Make `processSlotHolder` recursive**

Replace the flat sub-heir handling with recursive calls. The key change: when a representation heir is themselves dead and has sub-heirs, recursively call `processSlotHolder`:

```typescript
function processSlotHolder(
  holder: Person,
  slotShare: Fraction,
  activeOrder: number | null,
  persons: Person[],
  results: CalculationResult[],
): void {
  if (holder.status === '一般繼承') {
    results.push({
      id: holder.id,
      name: holder.name,
      relation: holder.relation,
      inheritanceShare: slotShare,
      reservedShare: multiply(slotShare, reservedRatio(holder.relation, activeOrder)),
    });
  } else if (holder.status === '死亡' || holder.status === '死亡絕嗣') {
    const repHeirs = persons.filter(
      p => p.status === '代位繼承' && p.parentId === holder.id
    );

    // Dead holder always gets zero
    results.push({
      id: holder.id,
      name: holder.name,
      relation: holder.relation,
      inheritanceShare: ZERO,
      reservedShare: ZERO,
    });

    if (repHeirs.length > 0) {
      const perRep = divide(slotShare, frac(repHeirs.length));
      for (const rep of repHeirs) {
        // Check if this rep heir is also dead with their own sub-heirs
        const repSubHeirs = persons.filter(
          p => p.status === '代位繼承' && p.parentId === rep.id
        );
        if ((rep.deathDate || rep.status === '死亡絕嗣') && repSubHeirs.length > 0) {
          // Recurse: treat this rep heir as a dead holder
          processSlotHolder(
            { ...rep, status: '死亡' },
            perRep,
            activeOrder,
            persons,
            results,
          );
        } else {
          results.push({
            id: rep.id,
            name: rep.name,
            relation: rep.relation,
            inheritanceShare: perRep,
            reservedShare: multiply(perRep, reservedRatio(rep.relation, activeOrder)),
          });
        }
      }
    }
  } else if (holder.status === '再轉繼承') {
    const subHeirs = persons.filter(
      p => p.status === '再轉繼承' && p.parentId === holder.id
    );

    results.push({
      id: holder.id,
      name: holder.name,
      relation: holder.relation,
      inheritanceShare: ZERO,
      reservedShare: ZERO,
    });

    if (subHeirs.length > 0) {
      const perSub = divide(slotShare, frac(subHeirs.length));
      for (const sub of subHeirs) {
        // Check if this sub-heir also has their own sub-heirs (recursive re-transfer)
        const subSubHeirs = persons.filter(
          p => p.status === '再轉繼承' && p.parentId === sub.id
        );
        if (sub.deathDate && subSubHeirs.length > 0) {
          processSlotHolder(sub, perSub, activeOrder, persons, results);
        } else {
          results.push({
            id: sub.id,
            name: sub.name,
            relation: sub.relation,
            inheritanceShare: perSub,
            reservedShare: multiply(perSub, reservedRatio(sub.relation, activeOrder)),
          });
        }
      }
    }
  } else if (holder.status === '代位繼承') {
    // A representation heir who is themselves dead — check for sub-heirs
    const repSubHeirs = persons.filter(
      p => p.status === '代位繼承' && p.parentId === holder.id
    );

    if (repSubHeirs.length > 0) {
      results.push({
        id: holder.id,
        name: holder.name,
        relation: holder.relation,
        inheritanceShare: ZERO,
        reservedShare: ZERO,
      });

      const perRep = divide(slotShare, frac(repSubHeirs.length));
      for (const rep of repSubHeirs) {
        const nextLevel = persons.filter(
          p => p.status === '代位繼承' && p.parentId === rep.id
        );
        if (rep.deathDate && nextLevel.length > 0) {
          processSlotHolder(rep, perRep, activeOrder, persons, results);
        } else {
          results.push({
            id: rep.id,
            name: rep.name,
            relation: rep.relation,
            inheritanceShare: perRep,
            reservedShare: multiply(perRep, reservedRatio(rep.relation, activeOrder)),
          });
        }
      }
    } else {
      results.push({
        id: holder.id,
        name: holder.name,
        relation: holder.relation,
        inheritanceShare: slotShare,
        reservedShare: multiply(slotShare, reservedRatio(holder.relation, activeOrder)),
      });
    }
  }
}
```

**Step 4: Run all tests**

Run: `npx vitest run src/lib/__tests__/inheritance.test.ts`
Expected: ALL tests pass (old and new)

**Step 5: Commit**

```bash
git add src/lib/inheritance.ts
git commit -m "feat: make processSlotHolder and determineActiveOrder recursive for multi-level inheritance"
```

---

### Task 5: Validation Updates — Tests and Implementation

**Files:**
- Modify: `src/lib/__tests__/validation.test.ts`
- Modify: `src/lib/validation.ts`

**Step 1: Add new validation test cases**

```typescript
it('errors on circular parentId reference', () => {
  const persons: Person[] = [
    { id: '1', name: 'A', relation: '子女', status: '代位繼承', parentId: '2' },
    { id: '2', name: 'B', relation: '子女', status: '代位繼承', parentId: '1' },
  ];
  const errors = validate(persons, decedent);
  expect(hasError(errors, '1', 'parentId') || hasError(errors, '2', 'parentId')).toBe(true);
});

it('errors when representation heir parent is alive', () => {
  const persons: Person[] = [
    { id: '1', name: 'A', relation: '子女', status: '一般繼承' },
    { id: '2', name: 'B', relation: '子女', status: '代位繼承', parentId: '1' },
  ];
  const errors = validate(persons, decedent);
  expect(hasError(errors, '2', 'parentId')).toBe(true);
});

it('allows multiple spouses with divorceDate (only current spouse counts)', () => {
  const persons: Person[] = [
    { id: '1', name: '前妻', relation: '配偶', status: '一般繼承', divorceDate: '2020-01-01' },
    { id: '2', name: '現任', relation: '配偶', status: '一般繼承' },
  ];
  const errors = validate(persons, decedent);
  expect(hasError(errors, '2', 'relation')).toBe(false);
});

it('errors when two current spouses (no divorceDate)', () => {
  const persons: Person[] = [
    { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
    { id: '2', name: '配偶B', relation: '配偶', status: '一般繼承' },
  ];
  const errors = validate(persons, decedent);
  expect(hasError(errors, '2', 'relation')).toBe(true);
});

it('per-person current spouse uniqueness with parentId', () => {
  // Person X has two current spouses (子女之配偶)
  const persons: Person[] = [
    { id: '1', name: 'X', relation: '子女', status: '死亡', deathDate: '2023-01-01' },
    { id: '2', name: 'X配偶A', relation: '子女之配偶', status: '再轉繼承', parentId: '1' },
    { id: '3', name: 'X配偶B', relation: '子女之配偶', status: '再轉繼承', parentId: '1' },
  ];
  const errors = validate(persons, decedent);
  expect(hasError(errors, '3', 'relation')).toBe(true);
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/validation.test.ts`
Expected: New tests FAIL

**Step 3: Implement validation changes**

Update `src/lib/validation.ts`:

```typescript
export function validate(persons: Person[], _decedent: Decedent): ValidationError[] {
  const errors: ValidationError[] = [];
  const personIds = new Set(persons.map(p => p.id));
  const personMap = new Map(persons.map(p => [p.id, p]));

  // Track current spouse count: for decedent (parentId undefined) and per-person
  const currentSpouseCount = new Map<string, number>(); // key = parentId || '__root__'

  for (const p of persons) {
    if (!p.name.trim()) {
      errors.push({ personId: p.id, field: 'name', message: '姓名不可為空' });
    }

    // Spouse uniqueness: current spouse (no divorceDate) per parent
    if (p.relation === '配偶' || p.relation === '子女之配偶') {
      if (!p.divorceDate) {
        const key = p.parentId || '__root__';
        const count = (currentSpouseCount.get(key) ?? 0) + 1;
        currentSpouseCount.set(key, count);
        if (count > 1) {
          errors.push({ personId: p.id, field: 'relation', message: '配偶最多只能有一位' });
        }
      }
    }

    // parentId checks for 代位繼承
    if (p.status === '代位繼承') {
      if (!p.parentId) {
        errors.push({ personId: p.id, field: 'parentId', message: '代位繼承人必須選擇被代位者' });
      } else if (!personIds.has(p.parentId)) {
        errors.push({ personId: p.id, field: 'parentId', message: '被代位者不存在' });
      } else {
        const parent = personMap.get(p.parentId);
        if (parent && parent.status !== '死亡' && parent.status !== '死亡絕嗣') {
          errors.push({ personId: p.id, field: 'parentId', message: '代位繼承的被代位者必須為死亡狀態' });
        }
      }
    }

    if ((p.status === '死亡' || p.status === '死亡絕嗣') && !p.deathDate) {
      errors.push({ personId: p.id, field: 'deathDate', message: '死亡狀態必須填寫死亡日期' });
    }
  }

  // Circular parentId check
  for (const p of persons) {
    if (!p.parentId) continue;
    const visited = new Set<string>();
    let current: string | undefined = p.id;
    while (current) {
      if (visited.has(current)) {
        errors.push({ personId: p.id, field: 'parentId', message: '親屬關係存在循環參照' });
        break;
      }
      visited.add(current);
      current = personMap.get(current)?.parentId;
    }
  }

  return errors;
}
```

**Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/validation.test.ts`
Expected: ALL tests pass

**Step 5: Commit**

```bash
git add src/lib/validation.ts src/lib/__tests__/validation.test.ts
git commit -m "feat: update validation for sub-heirs with circular check, spouse-per-parent, and parent-status check"
```

---

### Task 6: Recursive Tree Layout

**Files:**
- Modify: `src/lib/tree-layout.ts`

**Step 1: Rewrite tree-layout to support recursive sub-trees**

Replace the flat child → sub-heir rendering with a recursive `layoutSubtree` function. The key changes:

1. Children are those with `parentId === personId` (not filtered by relation)
2. Spouses of a person (`relation === '子女之配偶'` with matching parentId) go to the left
3. Children go below, recursing for each

```typescript
import type { Edge } from '@xyflow/react';
import type { Person, Decedent } from '../types/models.ts';
import type { CalculationResult } from './inheritance.ts';
import type { ValidationError } from './validation.ts';
import { ZERO } from './fraction.ts';
import type { PersonNodeData, PersonNodeType } from '../components/PersonNode.tsx';

const NODE_WIDTH = 208;
const NODE_HEIGHT = 200;
const H_GAP = 40;
const V_GAP = 80;

export function buildTreeLayout(
  decedent: Decedent,
  persons: Person[],
  results: CalculationResult[],
  selectedId: string | null,
  onSelect: (id: string) => void,
  onDelete: (id: string) => void,
  validationErrors: ValidationError[] = [],
): { nodes: PersonNodeType[]; edges: Edge[] } {
  const nodes: PersonNodeType[] = [];
  const edges: Edge[] = [];

  const resultMap = new Map(results.map((r) => [r.id, r]));
  const personErrorIds = new Set(validationErrors.map((e) => e.personId));

  function addPersonNode(person: Person, x: number, y: number) {
    const result = resultMap.get(person.id);
    nodes.push({
      id: person.id,
      type: 'person',
      position: { x, y },
      data: {
        name: person.name,
        relation: person.relation,
        status: person.status,
        birthDate: person.birthDate,
        deathDate: person.deathDate,
        marriageDate: person.marriageDate,
        divorceDate: person.divorceDate,
        inheritanceShare: result?.inheritanceShare ?? ZERO,
        reservedShare: result?.reservedShare ?? ZERO,
        isDecedent: false,
        isSelected: selectedId === person.id,
        hasErrors: personErrorIds.has(person.id),
        onSelect,
        onDelete,
      } satisfies PersonNodeData,
    });
  }

  /** Calculate the width needed by a person and all their descendants */
  function subtreeWidth(personId: string): number {
    const childPersons = persons.filter(
      (p) => p.parentId === personId && p.relation !== '子女之配偶',
    );
    if (childPersons.length === 0) return NODE_WIDTH;
    const childrenWidth = childPersons.reduce(
      (sum, c) => sum + subtreeWidth(c.id),
      0,
    );
    return Math.max(
      NODE_WIDTH,
      childrenWidth + (childPersons.length - 1) * H_GAP,
    );
  }

  /** Recursively layout a person's sub-heirs */
  function layoutSubtree(personId: string, cx: number, y: number) {
    // Find spouse of this person
    const personSpouse = persons.find(
      (p) => p.parentId === personId && p.relation === '子女之配偶',
    );
    if (personSpouse) {
      addPersonNode(personSpouse, cx - NODE_WIDTH - H_GAP, y);
      edges.push({
        id: `e-${personId}-${personSpouse.id}`,
        source: personId,
        target: personSpouse.id,
        type: 'straight',
        style: { strokeDasharray: '5,5' },
      });
      // Recurse into spouse's sub-heirs too
      layoutSubtree(personSpouse.id, cx - NODE_WIDTH - H_GAP, y);
    }

    // Find children of this person (exclude spouses)
    const childPersons = persons.filter(
      (p) => p.parentId === personId && p.relation !== '子女之配偶',
    );
    if (childPersons.length === 0) return;

    const childY = y + NODE_HEIGHT + V_GAP;
    const totalWidth =
      childPersons.reduce((sum, c) => sum + subtreeWidth(c.id), 0) +
      (childPersons.length - 1) * H_GAP;
    let currentX = cx - totalWidth / 2;

    for (const child of childPersons) {
      const w = subtreeWidth(child.id);
      const childCx = currentX + w / 2;
      addPersonNode(child, childCx - NODE_WIDTH / 2, childY);
      edges.push({
        id: `e-${personId}-${child.id}`,
        source: personId,
        target: child.id,
        style:
          child.status === '代位繼承'
            ? { strokeDasharray: '5,5' }
            : child.status === '再轉繼承'
              ? { strokeDasharray: '3,3' }
              : undefined,
      });
      // Recurse
      layoutSubtree(child.id, childCx - NODE_WIDTH / 2 + NODE_WIDTH / 2, childY);
      currentX += w + H_GAP;
    }
  }

  // --- Top-level layout (same structure as before) ---

  // Decedent at center
  nodes.push({
    id: decedent.id,
    type: 'person',
    position: { x: 0, y: 0 },
    data: {
      name: decedent.name || '(未命名)',
      relation: '配偶',
      status: '死亡',
      deathDate: decedent.deathDate,
      isDecedent: true,
      isSelected: false,
      onSelect,
      onDelete,
    } satisfies PersonNodeData,
  });

  // Spouse of decedent (direct, no parentId)
  const spouse = persons.find((p) => p.relation === '配偶' && !p.parentId);
  if (spouse) {
    addPersonNode(spouse, -(NODE_WIDTH + H_GAP), 0);
    edges.push({
      id: `e-${decedent.id}-${spouse.id}`,
      source: decedent.id,
      target: spouse.id,
      type: 'straight',
      style: { strokeDasharray: '5,5' },
    });
  }

  // Parents above
  const parentPersons = persons.filter(
    (p) => (p.relation === '父' || p.relation === '母') && !p.parentId,
  );
  const parentY = -(NODE_HEIGHT + V_GAP);
  const parentStartX = -((parentPersons.length - 1) * (NODE_WIDTH + H_GAP)) / 2;
  parentPersons.forEach((p, i) => {
    const x = parentStartX + i * (NODE_WIDTH + H_GAP);
    addPersonNode(p, x, parentY);
    edges.push({
      id: `e-${p.id}-${decedent.id}`,
      source: p.id,
      target: decedent.id,
    });
  });

  // Children below (direct children of decedent: relation=子女, no parentId)
  const directChildren = persons.filter(
    (p) => p.relation === '子女' && !p.parentId,
  );
  const childY = NODE_HEIGHT + V_GAP;
  const totalChildWidth =
    directChildren.reduce((sum, c) => sum + subtreeWidth(c.id), 0) +
    Math.max(0, directChildren.length - 1) * H_GAP;
  let childX = -totalChildWidth / 2;

  for (const child of directChildren) {
    const w = subtreeWidth(child.id);
    const cx = childX + w / 2;
    addPersonNode(child, cx - NODE_WIDTH / 2, childY);
    edges.push({
      id: `e-${decedent.id}-${child.id}`,
      source: decedent.id,
      target: child.id,
    });
    // Recurse into sub-tree
    layoutSubtree(child.id, cx, childY);
    childX += w + H_GAP;
  }

  // Siblings to the right
  const siblingPersons = persons.filter(
    (p) => p.relation === '兄弟姊妹' && !p.parentId,
  );
  siblingPersons.forEach((sib, i) => {
    const x = NODE_WIDTH + H_GAP * 2 + (spouse ? NODE_WIDTH + H_GAP : 0);
    const y = i * (NODE_HEIGHT + V_GAP / 2);
    addPersonNode(sib, x, y);
    edges.push({
      id: `e-${decedent.id}-${sib.id}`,
      source: decedent.id,
      target: sib.id,
    });
  });

  // Grandparents above parents
  const gpPersons = persons.filter((p) =>
    (['祖父', '祖母', '外祖父', '外祖母'] as string[]).includes(p.relation) && !p.parentId,
  );
  const gpY = parentY - NODE_HEIGHT - V_GAP;
  const gpStartX = -((gpPersons.length - 1) * (NODE_WIDTH + H_GAP)) / 2;
  gpPersons.forEach((gp, i) => {
    const x = gpStartX + i * (NODE_WIDTH + H_GAP);
    addPersonNode(gp, x, gpY);
    edges.push({
      id: `e-${gp.id}-${decedent.id}`,
      source: gp.id,
      target: decedent.id,
    });
  });

  return { nodes, edges };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/lib/tree-layout.ts
git commit -m "feat: recursive tree layout supporting unlimited depth sub-heirs"
```

---

### Task 7: Context Menu on Tree Nodes

**Files:**
- Create: `src/components/NodeContextMenu.tsx`
- Modify: `src/components/FamilyTree.tsx`
- Modify: `src/components/PersonNode.tsx`

**Step 1: Create NodeContextMenu component**

```typescript
// src/components/NodeContextMenu.tsx
import type { Relation } from '../types/models';

interface NodeContextMenuProps {
  x: number;
  y: number;
  personId: string;
  isDecedent: boolean;
  hasCurrentSpouse: boolean;
  onAddChild: (parentId: string) => void;
  onAddSpouse: (parentId: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function NodeContextMenu({
  x,
  y,
  personId,
  isDecedent,
  hasCurrentSpouse,
  onAddChild,
  onAddSpouse,
  onEdit,
  onDelete,
  onClose,
}: NodeContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div
        className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]"
        style={{ left: x, top: y }}
      >
        <button
          type="button"
          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
          onClick={() => { onAddChild(personId); onClose(); }}
        >
          + 新增子女
        </button>
        {!isDecedent && !hasCurrentSpouse && (
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
            onClick={() => { onAddSpouse(personId); onClose(); }}
          >
            + 新增配偶
          </button>
        )}
        <div className="border-t border-slate-100 my-1" />
        <button
          type="button"
          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
          onClick={() => { onEdit(personId); onClose(); }}
        >
          編輯
        </button>
        {!isDecedent && (
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => { onDelete(personId); onClose(); }}
          >
            刪除
          </button>
        )}
      </div>
    </>
  );
}
```

**Step 2: Add context menu state and handlers to FamilyTree**

In `src/components/FamilyTree.tsx`, add state for the context menu and wire up the `ADD_SUB_HEIR` dispatch:

```typescript
import { useCallback, useMemo, useState } from 'react';
import { NodeContextMenu } from './NodeContextMenu.tsx';

// Inside FamilyTree component:
const [contextMenu, setContextMenu] = useState<{
  x: number; y: number; personId: string; isDecedent: boolean;
} | null>(null);

const onContextMenu = useCallback(
  (personId: string, isDecedent: boolean, event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, personId, isDecedent });
  },
  [],
);

const onAddChild = useCallback(
  (parentId: string) => {
    dispatch({ type: 'ADD_SUB_HEIR', payload: { parentId, relation: '子女' } });
  },
  [dispatch],
);

const onAddSpouse = useCallback(
  (parentId: string) => {
    dispatch({ type: 'ADD_SUB_HEIR', payload: { parentId, relation: '子女之配偶' } });
  },
  [dispatch],
);
```

Pass `onContextMenu` through node data and render the context menu overlay.

**Step 3: Update PersonNode to emit onContextMenu**

Add `onContextMenu` to `PersonNodeData` and attach it to the node's `div`:

```typescript
// In PersonNodeData:
onContextMenu?: (id: string, isDecedent: boolean, event: React.MouseEvent) => void;

// In PersonNode component:
<div
  ...
  onContextMenu={(e) => data.onContextMenu?.(id, !!data.isDecedent, e)}
>
```

**Step 4: Pass onContextMenu through buildTreeLayout**

Add `onContextMenu` as a parameter to `buildTreeLayout` and include it in the node data.

**Step 5: Verify TypeScript compiles and visually test**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/components/NodeContextMenu.tsx src/components/FamilyTree.tsx src/components/PersonNode.tsx src/lib/tree-layout.ts
git commit -m "feat: add context menu on tree nodes for adding sub-heirs"
```

---

### Task 8: Left Panel — Sub-Heir Buttons in PersonEditor

**Files:**
- Modify: `src/components/PersonEditor.tsx`

**Step 1: Add sub-heir action buttons to PersonEditor**

After the date fields and before the delete button, add a section for sub-heir management:

```typescript
{/* Sub-heir buttons — show for non-spouse persons */}
{person.relation !== '配偶' && (
  <div className="border-t border-slate-200 pt-3">
    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
      此人的親屬
    </h3>
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => dispatch({
          type: 'ADD_SUB_HEIR',
          payload: { parentId: person.id, relation: '子女' },
        })}
        className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
      >
        + 新增子女
      </button>
      <button
        type="button"
        onClick={() => dispatch({
          type: 'ADD_SUB_HEIR',
          payload: { parentId: person.id, relation: '子女之配偶' },
        })}
        disabled={hasCurrentSpouseForPerson}
        className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        + 新增配偶
      </button>
    </div>
  </div>
)}
```

Compute `hasCurrentSpouseForPerson`:

```typescript
const hasCurrentSpouseForPerson = state.persons.some(
  p => p.parentId === person.id && p.relation === '子女之配偶' && !p.divorceDate
);
```

**Step 2: Update the relation select to include '子女之配偶'**

The `RELATION_OPTIONS` already includes it from Task 1, but the select should show it.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/PersonEditor.tsx
git commit -m "feat: add sub-heir buttons (child/spouse) to PersonEditor panel"
```

---

### Task 9: Node Quick-Add Button (+ on hover)

**Files:**
- Modify: `src/components/PersonNode.tsx`

**Step 1: Add expandable + button to node**

Add a hover-revealed `+` button at the bottom of each non-decedent node. On click, it expands to show "子女" and "配偶" options:

```typescript
// Add to PersonNodeData:
onAddChild?: (id: string) => void;
onAddSpouse?: (id: string) => void;
hasCurrentSpouse?: boolean;
```

Add to the node JSX, below the share section but before the bottom Handle:

```typescript
{!data.isDecedent && (
  <div className="flex justify-center gap-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); data.onAddChild?.(id); }}
      className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
      title="新增子女"
    >
      +子女
    </button>
    {!data.hasCurrentSpouse && (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); data.onAddSpouse?.(id); }}
        className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100"
        title="新增配偶"
      >
        +配偶
      </button>
    )}
  </div>
)}
```

**Step 2: Pass onAddChild, onAddSpouse through tree-layout**

Update `buildTreeLayout` to pass these callbacks through the node data, computing `hasCurrentSpouse` per person.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/PersonNode.tsx src/lib/tree-layout.ts src/components/FamilyTree.tsx
git commit -m "feat: add hover quick-add buttons (+子女, +配偶) on tree nodes"
```

---

### Task 10: Cascade Delete Confirmation Dialog

**Files:**
- Modify: `src/components/FamilyTree.tsx`

**Step 1: Add confirmation when deleting a person with descendants**

Update the `onDelete` callback to count descendants and show a confirmation:

```typescript
const onDelete = useCallback(
  (id: string) => {
    // Count descendants
    function countDescendants(personId: string): number {
      const children = state.persons.filter(p => p.parentId === personId);
      return children.reduce((sum, c) => sum + 1 + countDescendants(c.id), 0);
    }
    const descendantCount = countDescendants(id);
    const person = state.persons.find(p => p.id === id);
    const name = person?.name || '(未命名)';

    if (descendantCount > 0) {
      const confirmed = window.confirm(
        `刪除「${name}」將同時刪除其下 ${descendantCount} 位繼承人，是否確定？`
      );
      if (!confirmed) return;
    }

    dispatch({ type: 'DELETE_PERSON', payload: { id } });
  },
  [dispatch, state.persons],
);
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/FamilyTree.tsx
git commit -m "feat: add cascade delete confirmation dialog with descendant count"
```

---

### Task 11: Full Integration Verification

**Files:** None (verification only)

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds without errors or oversized chunk warnings

**Step 4: Manual smoke test checklist**

Open `http://localhost:5173/` and verify:

1. Add 被繼承人 + 配偶 + 2 子女 → shares correct
2. Right-click on 子女 → context menu appears with "新增子女", "新增配偶", "編輯", "刪除"
3. Click "新增子女" from context menu → grandchild appears below, parentId auto-set
4. Set child status to 死亡 → grandchild auto-sets to 代位繼承
5. Hover over node → quick-add buttons appear (+子女, +配偶)
6. Click +子女 on hover → grandchild created correctly
7. In PersonEditor, "此人的親屬" section visible with [+ 新增子女] [+ 新增配偶]
8. Add great-grandchild to grandchild → 3 levels deep renders correctly
9. Delete parent with children → confirmation dialog shows descendant count
10. Confirm delete → all descendants removed
11. Excel export/import with sub-heirs → data preserved

**Step 5: Commit verification note (optional)**

No code changes — verification only.
