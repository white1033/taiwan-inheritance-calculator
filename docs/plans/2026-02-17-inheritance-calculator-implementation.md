# Taiwan Inheritance Calculator - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a modern web app that calculates Taiwan statutory inheritance shares (應繼分) and reserved shares (特留分) with a visual family tree interface, replacing the legacy Judicial Yuan GDGT19 system.

**Architecture:** Single-page application built with Vite + React + TypeScript. All logic runs client-side (static deployment). Core layers: (1) Fraction math library for exact arithmetic, (2) Inheritance calculation engine encoding Taiwan Civil Code rules, (3) React Flow-based family tree UI, (4) Export services for Excel/PDF/print/PNG.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, React Flow, SheetJS (xlsx), html2canvas, jsPDF, Vitest, React Testing Library.

**Design doc:** `docs/plans/2026-02-17-inheritance-calculator-design.md`

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

**Step 1: Scaffold Vite + React + TypeScript project**

Run:
```bash
cd /Users/zachary_lee/projects/taiwan-inheritance-calculator
npm create vite@latest . -- --template react-ts
```

If prompted about existing files, choose to proceed (the `docs/` dir won't conflict).

**Step 2: Install dependencies**

Run:
```bash
npm install reactflow @xyflow/react xlsx jspdf html2canvas
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Step 3: Configure Tailwind CSS**

Replace `src/index.css` with:
```css
@import "tailwindcss";
```

Update `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**Step 4: Configure Vitest**

Add to `vite.config.ts` (merge with existing):
```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
```

Create `src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest';
```

**Step 5: Add scripts to package.json**

Ensure `package.json` scripts include:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  }
}
```

**Step 6: Verify project builds and tests run**

Run:
```bash
npm run build
npm run test:run
```

Expected: Build succeeds with output in `dist/`. Tests pass (or no tests found yet — that's fine).

**Step 7: Create directory structure**

```bash
mkdir -p src/lib src/components src/context src/hooks src/types
```

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript project with Tailwind and Vitest"
```

---

## Task 2: Fraction Math Library

This is the foundation for exact arithmetic. All inheritance share calculations use fractions (e.g., 1/3, not 0.333...).

**Files:**
- Create: `src/lib/fraction.ts`
- Create: `src/lib/__tests__/fraction.test.ts`

**Step 1: Write failing tests for Fraction utility**

Create `src/lib/__tests__/fraction.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { frac, add, subtract, multiply, divide, equals, toString, simplify } from '../fraction';

describe('Fraction', () => {
  describe('frac (constructor)', () => {
    it('creates a fraction', () => {
      expect(frac(1, 3)).toEqual({ n: 1, d: 3 });
    });

    it('auto-simplifies', () => {
      expect(frac(2, 6)).toEqual({ n: 1, d: 3 });
    });

    it('handles zero numerator', () => {
      expect(frac(0, 5)).toEqual({ n: 0, d: 1 });
    });

    it('throws on zero denominator', () => {
      expect(() => frac(1, 0)).toThrow();
    });

    it('normalizes negative denominator', () => {
      expect(frac(1, -3)).toEqual({ n: -1, d: 3 });
    });
  });

  describe('add', () => {
    it('adds fractions with same denominator', () => {
      expect(add(frac(1, 3), frac(1, 3))).toEqual(frac(2, 3));
    });

    it('adds fractions with different denominators', () => {
      expect(add(frac(1, 2), frac(1, 3))).toEqual(frac(5, 6));
    });

    it('simplifies result', () => {
      expect(add(frac(1, 4), frac(1, 4))).toEqual(frac(1, 2));
    });
  });

  describe('subtract', () => {
    it('subtracts fractions', () => {
      expect(subtract(frac(1, 2), frac(1, 3))).toEqual(frac(1, 6));
    });

    it('returns zero when equal', () => {
      expect(subtract(frac(1, 3), frac(1, 3))).toEqual(frac(0, 1));
    });
  });

  describe('multiply', () => {
    it('multiplies fractions', () => {
      expect(multiply(frac(1, 2), frac(1, 3))).toEqual(frac(1, 6));
    });

    it('multiplies and simplifies', () => {
      expect(multiply(frac(2, 3), frac(3, 4))).toEqual(frac(1, 2));
    });
  });

  describe('divide', () => {
    it('divides fractions', () => {
      expect(divide(frac(1, 2), frac(1, 3))).toEqual(frac(3, 2));
    });

    it('throws on division by zero', () => {
      expect(() => divide(frac(1, 2), frac(0, 1))).toThrow();
    });
  });

  describe('equals', () => {
    it('returns true for equal fractions', () => {
      expect(equals(frac(1, 3), frac(2, 6))).toBe(true);
    });

    it('returns false for unequal fractions', () => {
      expect(equals(frac(1, 3), frac(1, 4))).toBe(false);
    });
  });

  describe('toString', () => {
    it('formats as fraction string', () => {
      expect(toString(frac(1, 3))).toBe('1/3');
    });

    it('formats whole number without denominator', () => {
      expect(toString(frac(3, 1))).toBe('3');
    });

    it('formats zero', () => {
      expect(toString(frac(0, 1))).toBe('0');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/fraction.test.ts`

Expected: FAIL — module `../fraction` not found.

**Step 3: Implement Fraction library**

Create `src/lib/fraction.ts`:
```typescript
export interface Fraction {
  readonly n: number; // numerator
  readonly d: number; // denominator (always positive)
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function simplify(n: number, d: number): Fraction {
  if (d === 0) throw new Error('Denominator cannot be zero');
  if (n === 0) return { n: 0, d: 1 };
  const sign = d < 0 ? -1 : 1;
  n = n * sign;
  d = d * sign;
  const g = gcd(Math.abs(n), d);
  return { n: n / g, d: d / g };
}

export function frac(n: number, d: number = 1): Fraction {
  return simplify(n, d);
}

export function add(a: Fraction, b: Fraction): Fraction {
  return simplify(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function subtract(a: Fraction, b: Fraction): Fraction {
  return simplify(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function multiply(a: Fraction, b: Fraction): Fraction {
  return simplify(a.n * b.n, a.d * b.d);
}

export function divide(a: Fraction, b: Fraction): Fraction {
  if (b.n === 0) throw new Error('Division by zero');
  return simplify(a.n * b.d, a.d * b.n);
}

export function equals(a: Fraction, b: Fraction): boolean {
  return a.n * b.d === b.n * a.d;
}

export function toString(f: Fraction): string {
  if (f.n === 0) return '0';
  if (f.d === 1) return `${f.n}`;
  return `${f.n}/${f.d}`;
}

export const ZERO = frac(0);
export const ONE = frac(1);
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/fraction.test.ts`

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/lib/fraction.ts src/lib/__tests__/fraction.test.ts
git commit -m "feat: add exact fraction arithmetic library"
```

---

## Task 3: Type Definitions

**Files:**
- Create: `src/types/models.ts`

**Step 1: Create type definitions**

Create `src/types/models.ts`:
```typescript
import type { Fraction } from '../lib/fraction';

export type InheritanceStatus =
  | '一般繼承'
  | '死亡'
  | '死亡絕嗣'
  | '拋棄繼承'
  | '代位繼承'
  | '再轉繼承';

export type Relation =
  | '配偶'
  | '子女'
  | '父'
  | '母'
  | '兄弟姊妹'
  | '祖父'
  | '祖母'
  | '外祖父'
  | '外祖母';

/** Which inheritance order does this relation belong to? */
export function getOrder(relation: Relation): number | null {
  switch (relation) {
    case '配偶': return null; // unconditional heir
    case '子女': return 1;
    case '父': case '母': return 2;
    case '兄弟姊妹': return 3;
    case '祖父': case '祖母': case '外祖父': case '外祖母': return 4;
  }
}

export interface Person {
  id: string;
  name: string;
  relation: Relation;
  status: InheritanceStatus;
  birthDate?: string;
  deathDate?: string;
  marriageDate?: string;
  divorceDate?: string;
  /** ID of the person this heir inherits from (被繼承人 or for 代位/再轉 the intermediate person) */
  parentId?: string;
  inheritanceShare?: Fraction;
  reservedShare?: Fraction;
}

export interface Decedent {
  id: string;
  name: string;
  deathDate?: string;
}

export interface InheritanceCase {
  decedent: Decedent;
  persons: Person[];
}

export const INHERITANCE_STATUS_OPTIONS: InheritanceStatus[] = [
  '一般繼承',
  '死亡',
  '死亡絕嗣',
  '拋棄繼承',
  '代位繼承',
  '再轉繼承',
];

export const RELATION_OPTIONS: Relation[] = [
  '配偶',
  '子女',
  '父',
  '母',
  '兄弟姊妹',
  '祖父',
  '祖母',
  '外祖父',
  '外祖母',
];
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

**Step 3: Commit**

```bash
git add src/types/models.ts
git commit -m "feat: add core type definitions for inheritance data model"
```

---

## Task 4: Inheritance Calculation Engine

This is the most critical piece — encodes all Taiwan Civil Code inheritance rules.

**Files:**
- Create: `src/lib/inheritance.ts`
- Create: `src/lib/__tests__/inheritance.test.ts`

**Step 1: Write failing tests for basic scenarios**

Create `src/lib/__tests__/inheritance.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateShares, CalculationResult } from '../inheritance';
import { frac, equals, toString } from '../fraction';
import type { Person, Decedent } from '../../types/models';

function expectShare(results: CalculationResult[], name: string, n: number, d: number) {
  const person = results.find(r => r.name === name);
  expect(person, `Person "${name}" not found in results`).toBeDefined();
  expect(
    equals(person!.inheritanceShare, frac(n, d)),
    `Expected ${name} share = ${n}/${d}, got ${toString(person!.inheritanceShare)}`
  ).toBe(true);
}

function expectReserved(results: CalculationResult[], name: string, n: number, d: number) {
  const person = results.find(r => r.name === name);
  expect(person, `Person "${name}" not found in results`).toBeDefined();
  expect(
    equals(person!.reservedShare, frac(n, d)),
    `Expected ${name} reserved = ${n}/${d}, got ${toString(person!.reservedShare)}`
  ).toBe(true);
}

const decedent: Decedent = { id: 'D', name: '被繼承人', deathDate: '2024-01-01' };

describe('calculateShares', () => {
  describe('Spouse + First Order (Children)', () => {
    it('spouse + 2 children: each gets 1/3', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 3);
      expectShare(results, '長子', 1, 3);
      expectShare(results, '次子', 1, 3);
    });

    it('spouse + 1 child: each gets 1/2', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '獨子', relation: '子女', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '獨子', 1, 2);
    });

    it('no spouse, 3 children: each gets 1/3', () => {
      const persons: Person[] = [
        { id: '1', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '2', name: '次子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '三子', relation: '子女', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '長子', 1, 3);
      expectShare(results, '次子', 1, 3);
      expectShare(results, '三子', 1, 3);
    });
  });

  describe('Spouse + Second Order (Parents)', () => {
    it('spouse + father + mother: spouse 1/2, each parent 1/4', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '父親', relation: '父', status: '一般繼承' },
        { id: '3', name: '母親', relation: '母', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '父親', 1, 4);
      expectShare(results, '母親', 1, 4);
    });
  });

  describe('Spouse + Third Order (Siblings)', () => {
    it('spouse + 2 siblings: spouse 1/2, each sibling 1/4', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '兄', relation: '兄弟姊妹', status: '一般繼承' },
        { id: '3', name: '姊', relation: '兄弟姊妹', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '兄', 1, 4);
      expectShare(results, '姊', 1, 4);
    });
  });

  describe('Spouse + Fourth Order (Grandparents)', () => {
    it('spouse + paternal grandparents: spouse 2/3, each grandparent 1/6', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '祖父A', relation: '祖父', status: '一般繼承' },
        { id: '3', name: '祖母A', relation: '祖母', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 2, 3);
      expectShare(results, '祖父A', 1, 6);
      expectShare(results, '祖母A', 1, 6);
    });
  });

  describe('Spouse Only', () => {
    it('spouse alone: gets 100%', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 1);
    });
  });

  describe('Renunciation (拋棄繼承)', () => {
    it('one child renounces: share redistributed to remaining', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '拋棄繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '長子', 1, 2);
      expectShare(results, '次子', 0, 1);
    });

    it('all children renounce: falls to second order (parents)', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '拋棄繼承' },
        { id: '3', name: '父親', relation: '父', status: '一般繼承' },
        { id: '4', name: '母親', relation: '母', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '長子', 0, 1);
      expectShare(results, '父親', 1, 4);
      expectShare(results, '母親', 1, 4);
    });
  });

  describe('Representation (代位繼承)', () => {
    it('one child dies, grandchildren represent: grandchildren split dead child share', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '死亡', deathDate: '2023-06-01' },
        { id: '4', name: '孫1', relation: '子女', status: '代位繼承', parentId: '3' },
        { id: '5', name: '孫2', relation: '子女', status: '代位繼承', parentId: '3' },
      ];
      // Spouse + 長子 + 次子(dead) = 3 equal shares = 1/3 each
      // 次子's 1/3 split between 孫1 and 孫2 = 1/6 each
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 3);
      expectShare(results, '長子', 1, 3);
      expectShare(results, '次子', 0, 1);
      expectShare(results, '孫1', 1, 6);
      expectShare(results, '孫2', 1, 6);
    });
  });

  describe('Re-transfer (再轉繼承)', () => {
    it('one child dies after decedent: child share goes to child own heirs', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '再轉繼承', deathDate: '2024-03-01' },
        { id: '4', name: '次子配偶', relation: '配偶', status: '再轉繼承', parentId: '3' },
        { id: '5', name: '孫1', relation: '子女', status: '再轉繼承', parentId: '3' },
        { id: '6', name: '孫2', relation: '子女', status: '再轉繼承', parentId: '3' },
      ];
      // Spouse + 長子 + 次子 = 3 equal shares = 1/3 each
      // 次子's 1/3 re-transferred to: 次子配偶, 孫1, 孫2 (3 people, equal) = 1/9 each
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 3);
      expectShare(results, '長子', 1, 3);
      expectShare(results, '次子', 0, 1);
      expectShare(results, '次子配偶', 1, 9);
      expectShare(results, '孫1', 1, 9);
      expectShare(results, '孫2', 1, 9);
    });
  });

  describe('Reserved Shares (特留分)', () => {
    it('calculates reserved shares for spouse + children', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      // Each gets 1/3 statutory, reserved = 1/2 of statutory = 1/6
      expectReserved(results, '配偶A', 1, 6);
      expectReserved(results, '長子', 1, 6);
      expectReserved(results, '次子', 1, 6);
    });

    it('calculates reserved shares for spouse + siblings', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '兄', relation: '兄弟姊妹', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      // Spouse = 1/2, reserved = 1/2 * 1/2 = 1/4
      // Sibling = 1/2, reserved = 1/2 * 1/3 = 1/6
      expectReserved(results, '配偶A', 1, 4);
      expectReserved(results, '兄', 1, 6);
    });
  });

  describe('Edge Cases', () => {
    it('no persons at all: returns empty array', () => {
      const results = calculateShares(decedent, []);
      expect(results).toEqual([]);
    });

    it('only non-inheriting persons (all renounced, no fallback): returns zero shares', () => {
      const persons: Person[] = [
        { id: '1', name: '長子', relation: '子女', status: '拋棄繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '長子', 0, 1);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/inheritance.test.ts`

Expected: FAIL — module `../inheritance` not found.

**Step 3: Implement the calculation engine**

Create `src/lib/inheritance.ts`:
```typescript
import { frac, add, multiply, divide, Fraction, ZERO } from './fraction';
import type { Person, Decedent, Relation } from '../types/models';
import { getOrder } from '../types/models';

export interface CalculationResult {
  id: string;
  name: string;
  relation: Relation;
  inheritanceShare: Fraction;
  reservedShare: Fraction;
}

/**
 * Get the reserved share ratio for a given relation type.
 * Art. 1223: descendants/parents/spouse = 1/2, siblings/grandparents = 1/3
 */
function getReservedRatio(relation: Relation): Fraction {
  switch (relation) {
    case '配偶':
    case '子女':
    case '父':
    case '母':
      return frac(1, 2);
    case '兄弟姊妹':
    case '祖父':
    case '祖母':
    case '外祖父':
    case '外祖母':
      return frac(1, 3);
  }
}

/**
 * Determine the active inheritance order.
 * Checks orders 1-4, returns the first order that has at least one active heir.
 * "Active" means status is '一般繼承' or has representation/re-transfer sub-heirs.
 */
function determineActiveOrder(persons: Person[]): number | null {
  for (let order = 1; order <= 4; order++) {
    const heirsInOrder = persons.filter(p => {
      const pOrder = getOrder(p.relation);
      if (pOrder !== order) return false;
      // A person in this order is "active" if they are 一般繼承,
      // or 死亡/再轉繼承 with sub-heirs (handled elsewhere)
      return p.status === '一般繼承' || p.status === '死亡' || p.status === '再轉繼承';
    });
    if (heirsInOrder.length > 0) return order;
  }
  return null;
}

/**
 * Get the spouse's fixed share ratio based on the active order.
 * Art. 1144.
 */
function getSpouseShareForOrder(order: number | null, totalHeirsWithSpouse: number): Fraction {
  switch (order) {
    case 1:
      // Equal share with children: 1 / (spouse + children count)
      return frac(1, totalHeirsWithSpouse);
    case 2:
    case 3:
      return frac(1, 2);
    case 4:
      return frac(2, 3);
    case null:
      // No other heirs → spouse gets all
      return frac(1, 1);
    default:
      return ZERO;
  }
}

export function calculateShares(decedent: Decedent, persons: Person[]): CalculationResult[] {
  if (persons.length === 0) return [];

  const spouse = persons.find(p => p.relation === '配偶' && p.status !== '拋棄繼承');
  const hasSpouse = !!spouse;

  // Separate persons by role
  const nonSpousePersons = persons.filter(p => p.relation !== '配偶' && p.status !== '代位繼承' && p.status !== '再轉繼承');
  const representationHeirs = persons.filter(p => p.status === '代位繼承');
  const retransferHeirs = persons.filter(p => p.status === '再轉繼承' && p.parentId);

  // Determine active order (considering renunciation)
  const activeOrder = determineActiveOrder(nonSpousePersons);

  // Get active heirs in the determined order
  const activeHeirsInOrder = nonSpousePersons.filter(p => {
    const pOrder = getOrder(p.relation);
    return pOrder === activeOrder && p.status === '一般繼承';
  });

  // Count dead heirs in order that have representation
  const deadHeirsWithRep = nonSpousePersons.filter(p => {
    const pOrder = getOrder(p.relation);
    return pOrder === activeOrder && p.status === '死亡' &&
      representationHeirs.some(r => r.parentId === p.id);
  });

  // Count re-transfer heirs in order
  const retransferOriginals = nonSpousePersons.filter(p => {
    const pOrder = getOrder(p.relation);
    return pOrder === activeOrder && p.status === '再轉繼承' &&
      retransferHeirs.some(r => r.parentId === p.id);
  });

  // Total "slots" for division = active heirs + dead-with-rep + re-transfer originals
  const totalSlots = activeHeirsInOrder.length + deadHeirsWithRep.length + retransferOriginals.length;

  // Build results map
  const results = new Map<string, CalculationResult>();

  // Initialize all persons with zero
  for (const p of persons) {
    results.set(p.id, {
      id: p.id,
      name: p.name,
      relation: p.relation,
      inheritanceShare: ZERO,
      reservedShare: ZERO,
    });
  }

  if (totalSlots === 0 && !hasSpouse) {
    // No valid heirs at all
    return Array.from(results.values());
  }

  // Calculate spouse share
  if (hasSpouse && spouse) {
    let spouseShare: Fraction;
    if (activeOrder === 1) {
      // Equal with children: 1 / (1 + totalSlots)
      spouseShare = frac(1, 1 + totalSlots);
    } else if (activeOrder === null || totalSlots === 0) {
      spouseShare = frac(1, 1);
    } else {
      spouseShare = getSpouseShareForOrder(activeOrder, 0);
    }
    const spouseResult = results.get(spouse.id)!;
    spouseResult.inheritanceShare = spouseShare;
    spouseResult.reservedShare = multiply(spouseShare, getReservedRatio('配偶'));
  }

  // Calculate per-slot share for other heirs
  if (totalSlots > 0) {
    let remainingShare: Fraction;
    if (activeOrder === 1) {
      // First order: each slot = 1 / (spouse?1:0 + totalSlots)
      const totalPeople = (hasSpouse ? 1 : 0) + totalSlots;
      remainingShare = frac(1, totalPeople); // per slot
    } else {
      // Orders 2-4: spouse gets fixed portion, rest split equally
      const spouseFixed = hasSpouse ? getSpouseShareForOrder(activeOrder, 0) : ZERO;
      const poolForOthers = { n: 1 - spouseFixed.n * (1 / spouseFixed.d === spouseFixed.n ? 1 : 0), d: 1 };
      // Simpler: remaining = 1 - spouseShare
      const remaining = hasSpouse
        ? frac(1 * spouseFixed.d - spouseFixed.n, spouseFixed.d)
        : frac(1, 1);
      remainingShare = divide(remaining, frac(totalSlots));
    }

    // Assign shares to active heirs
    for (const heir of activeHeirsInOrder) {
      const r = results.get(heir.id)!;
      r.inheritanceShare = remainingShare;
      r.reservedShare = multiply(remainingShare, getReservedRatio(heir.relation));
    }

    // Assign shares to dead heirs (zero) and their representation sub-heirs
    for (const deadHeir of deadHeirsWithRep) {
      const reps = representationHeirs.filter(r => r.parentId === deadHeir.id);
      const repShare = divide(remainingShare, frac(reps.length));
      for (const rep of reps) {
        const r = results.get(rep.id)!;
        r.inheritanceShare = repShare;
        r.reservedShare = multiply(repShare, getReservedRatio(rep.relation));
      }
    }

    // Assign shares to re-transfer originals (zero) and their sub-heirs
    for (const original of retransferOriginals) {
      const subs = retransferHeirs.filter(r => r.parentId === original.id);
      // Re-transfer: the original's share is divided among the sub-heirs equally
      // (spouse of original + children of original, all equal — first order logic)
      const subShare = divide(remainingShare, frac(subs.length));
      for (const sub of subs) {
        const r = results.get(sub.id)!;
        r.inheritanceShare = subShare;
        r.reservedShare = multiply(subShare, getReservedRatio(sub.relation));
      }
    }
  }

  return Array.from(results.values());
}
```

**Step 4: Run tests and iterate**

Run: `npx vitest run src/lib/__tests__/inheritance.test.ts`

Expected: All tests PASS. If any test fails, debug and fix the logic until all pass.

**Step 5: Commit**

```bash
git add src/lib/inheritance.ts src/lib/__tests__/inheritance.test.ts
git commit -m "feat: add inheritance calculation engine with full Taiwan Civil Code rules"
```

---

## Task 5: React Context for State Management

**Files:**
- Create: `src/context/InheritanceContext.tsx`

**Step 1: Create the context provider**

Create `src/context/InheritanceContext.tsx`:
```typescript
import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Person, Decedent, InheritanceStatus, Relation } from '../types/models';
import { calculateShares, type CalculationResult } from '../lib/inheritance';

interface State {
  decedent: Decedent;
  persons: Person[];
  results: CalculationResult[];
  selectedPersonId: string | null;
}

type Action =
  | { type: 'SET_DECEDENT'; payload: Partial<Decedent> }
  | { type: 'ADD_PERSON'; payload: { relation: Relation } }
  | { type: 'UPDATE_PERSON'; payload: { id: string; updates: Partial<Person> } }
  | { type: 'DELETE_PERSON'; payload: { id: string } }
  | { type: 'SELECT_PERSON'; payload: { id: string | null } }
  | { type: 'LOAD_PERSONS'; payload: { decedent: Decedent; persons: Person[] } };

let nextId = 1;
function generateId(): string {
  return `p_${nextId++}`;
}

function recalculate(decedent: Decedent, persons: Person[]): CalculationResult[] {
  return calculateShares(decedent, persons);
}

const initialState: State = {
  decedent: { id: 'decedent', name: '', deathDate: '' },
  persons: [],
  results: [],
  selectedPersonId: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DECEDENT': {
      const decedent = { ...state.decedent, ...action.payload };
      return { ...state, decedent, results: recalculate(decedent, state.persons) };
    }
    case 'ADD_PERSON': {
      const newPerson: Person = {
        id: generateId(),
        name: '',
        relation: action.payload.relation,
        status: '一般繼承',
      };
      const persons = [...state.persons, newPerson];
      return {
        ...state,
        persons,
        results: recalculate(state.decedent, persons),
        selectedPersonId: newPerson.id,
      };
    }
    case 'UPDATE_PERSON': {
      const persons = state.persons.map(p =>
        p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
      );
      return { ...state, persons, results: recalculate(state.decedent, persons) };
    }
    case 'DELETE_PERSON': {
      const persons = state.persons.filter(p => p.id !== action.payload.id);
      return {
        ...state,
        persons,
        results: recalculate(state.decedent, persons),
        selectedPersonId: state.selectedPersonId === action.payload.id ? null : state.selectedPersonId,
      };
    }
    case 'SELECT_PERSON': {
      return { ...state, selectedPersonId: action.payload.id };
    }
    case 'LOAD_PERSONS': {
      return {
        ...state,
        decedent: action.payload.decedent,
        persons: action.payload.persons,
        results: recalculate(action.payload.decedent, action.payload.persons),
      };
    }
    default:
      return state;
  }
}

const InheritanceContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function InheritanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <InheritanceContext.Provider value={{ state, dispatch }}>
      {children}
    </InheritanceContext.Provider>
  );
}

export function useInheritance() {
  const context = useContext(InheritanceContext);
  if (!context) throw new Error('useInheritance must be used within InheritanceProvider');
  return context;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`

Expected: No errors.

**Step 3: Commit**

```bash
git add src/context/InheritanceContext.tsx
git commit -m "feat: add React Context state management for inheritance data"
```

---

## Task 6: App Shell & Layout Components

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/Header.tsx`
- Create: `src/components/LeftPanel.tsx`
- Create: `src/components/ExportToolbar.tsx`

**Step 1: Create Header component**

Create `src/components/Header.tsx`:
```typescript
export function Header() {
  return (
    <header className="bg-slate-800 text-white px-6 py-4">
      <h1 className="text-xl font-bold">繼承系統表計算工具</h1>
      <p className="text-slate-300 text-sm mt-1">
        依據台灣民法繼承編，計算法定應繼分與特留分
      </p>
    </header>
  );
}
```

**Step 2: Create LeftPanel component (stub)**

Create `src/components/LeftPanel.tsx`:
```typescript
import { useInheritance } from '../context/InheritanceContext';
import type { Relation } from '../types/models';
import { toString } from '../lib/fraction';

const HEIR_BUTTONS: { label: string; relation: Relation }[] = [
  { label: '+ 配偶', relation: '配偶' },
  { label: '+ 子女', relation: '子女' },
  { label: '+ 父', relation: '父' },
  { label: '+ 母', relation: '母' },
  { label: '+ 兄弟姊妹', relation: '兄弟姊妹' },
  { label: '+ 祖父', relation: '祖父' },
  { label: '+ 祖母', relation: '祖母' },
  { label: '+ 外祖父', relation: '外祖父' },
  { label: '+ 外祖母', relation: '外祖母' },
];

export function LeftPanel() {
  const { state, dispatch } = useInheritance();
  const hasSpouse = state.persons.some(p => p.relation === '配偶');

  return (
    <div className="w-80 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
      {/* Decedent Info */}
      <section className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          被繼承人資訊
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">姓名</label>
            <input
              type="text"
              value={state.decedent.name}
              onChange={e => dispatch({ type: 'SET_DECEDENT', payload: { name: e.target.value } })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="請輸入被繼承人姓名"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">死亡日期</label>
            <input
              type="date"
              value={state.decedent.deathDate || ''}
              onChange={e => dispatch({ type: 'SET_DECEDENT', payload: { deathDate: e.target.value } })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Add Heir Buttons */}
      <section className="p-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          新增繼承人
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {HEIR_BUTTONS.map(({ label, relation }) => {
            const disabled = relation === '配偶' && hasSpouse;
            return (
              <button
                key={relation}
                onClick={() => dispatch({ type: 'ADD_PERSON', payload: { relation } })}
                disabled={disabled}
                className="px-3 py-2 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Results Summary */}
      <section className="p-4 flex-1">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          計算結果
        </h2>
        {state.results.length === 0 ? (
          <p className="text-sm text-slate-400">請先新增繼承人</p>
        ) : (
          <div className="space-y-2">
            {state.results
              .filter(r => r.inheritanceShare.n > 0)
              .map(r => (
                <div key={r.id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                  <span className="font-medium">{r.name || '(未命名)'}</span>
                  <div className="text-right">
                    <div className="text-blue-600 font-mono">
                      應繼分 {toString(r.inheritanceShare)}
                    </div>
                    <div className="text-slate-400 font-mono text-xs">
                      特留分 {toString(r.reservedShare)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

**Step 3: Create ExportToolbar component (stub)**

Create `src/components/ExportToolbar.tsx`:
```typescript
export function ExportToolbar() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex gap-3">
      <button className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        🖨️ 列印
      </button>
      <button className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        📊 Excel 匯出
      </button>
      <button className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        📊 Excel 匯入
      </button>
      <button className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        📄 PDF 匯出
      </button>
      <button className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm hover:bg-slate-50 transition-colors">
        🌳 繼承系統圖
      </button>
    </footer>
  );
}
```

**Step 4: Wire up App.tsx**

Replace `src/App.tsx`:
```typescript
import { InheritanceProvider } from './context/InheritanceContext';
import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { ExportToolbar } from './components/ExportToolbar';

export default function App() {
  return (
    <InheritanceProvider>
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <LeftPanel />
          <main className="flex-1 bg-slate-100 flex items-center justify-center text-slate-400">
            {/* Family tree will go here in Task 7 */}
            <p>家族樹（待實作）</p>
          </main>
        </div>
        <ExportToolbar />
      </div>
    </InheritanceProvider>
  );
}
```

**Step 5: Verify app runs**

Run: `npm run dev`

Expected: Opens browser, shows header + left panel + placeholder main area + export toolbar.

**Step 6: Commit**

```bash
git add src/App.tsx src/components/Header.tsx src/components/LeftPanel.tsx src/components/ExportToolbar.tsx
git commit -m "feat: add app shell with header, left panel, and export toolbar"
```

---

## Task 7: Family Tree Visualization (React Flow)

**Files:**
- Create: `src/components/FamilyTree.tsx`
- Create: `src/components/PersonNode.tsx`
- Create: `src/lib/tree-layout.ts`
- Modify: `src/App.tsx`

**Step 1: Create PersonNode custom node**

Create `src/components/PersonNode.tsx`:
```typescript
import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { InheritanceStatus, Relation } from '../types/models';
import type { Fraction } from '../lib/fraction';
import { toString } from '../lib/fraction';

export interface PersonNodeData {
  name: string;
  relation: Relation;
  status: InheritanceStatus;
  birthDate?: string;
  deathDate?: string;
  marriageDate?: string;
  divorceDate?: string;
  inheritanceShare?: Fraction;
  reservedShare?: Fraction;
  isDecedent?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const STATUS_COLORS: Record<InheritanceStatus | 'decedent', string> = {
  '一般繼承': 'border-t-green-500',
  '死亡': 'border-t-gray-400',
  '死亡絕嗣': 'border-t-gray-400',
  '拋棄繼承': 'border-t-red-500',
  '代位繼承': 'border-t-emerald-400',
  '再轉繼承': 'border-t-orange-400',
  decedent: 'border-t-slate-700',
};

function formatDate(d?: string): string {
  return d || '—';
}

export const PersonNode = memo(function PersonNode({ id, data }: NodeProps) {
  const d = data as PersonNodeData;
  const colorClass = d.isDecedent ? STATUS_COLORS.decedent : STATUS_COLORS[d.status];
  const ringClass = d.isSelected ? 'ring-2 ring-blue-500' : '';

  return (
    <div
      className={`bg-white rounded-lg shadow-md border-t-4 ${colorClass} ${ringClass} w-52 cursor-pointer relative group`}
      onClick={() => d.onSelect?.(id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />

      {!d.isDecedent && (
        <button
          onClick={e => { e.stopPropagation(); d.onDelete?.(id); }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-100 text-red-500 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      )}

      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-500">{d.isDecedent ? '被繼承人' : d.relation}</span>
          {d.status === '拋棄繼承' && (
            <span className="text-xs bg-red-100 text-red-600 px-1 rounded">拋棄</span>
          )}
          {d.status === '代位繼承' && (
            <span className="text-xs bg-emerald-100 text-emerald-600 px-1 rounded">代位</span>
          )}
          {d.status === '再轉繼承' && (
            <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">再轉</span>
          )}
        </div>
        <div className={`font-semibold text-sm ${d.status === '拋棄繼承' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
          {d.name || '(未命名)'}
        </div>
      </div>

      <div className="px-3 py-1 border-t border-slate-100 text-xs text-slate-500 space-y-0.5">
        <div>出生：{formatDate(d.birthDate)}</div>
        <div>死亡：{formatDate(d.deathDate)}</div>
        <div>結婚：{formatDate(d.marriageDate)}</div>
        <div>離婚：{formatDate(d.divorceDate)}</div>
      </div>

      {!d.isDecedent && d.inheritanceShare && (
        <div className="px-3 py-2 border-t border-slate-100 text-xs">
          <div className="text-blue-600 font-mono font-semibold">
            應繼分 {toString(d.inheritanceShare)}
          </div>
          {d.reservedShare && (
            <div className="text-slate-400 font-mono">
              特留分 {toString(d.reservedShare)}
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
});
```

**Step 2: Create tree layout utility**

Create `src/lib/tree-layout.ts`:
```typescript
import type { Node, Edge } from '@xyflow/react';
import type { Person, Decedent } from '../types/models';
import type { CalculationResult } from './inheritance';
import { ZERO } from './fraction';
import type { PersonNodeData } from '../components/PersonNode';

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
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const resultMap = new Map(results.map(r => [r.id, r]));

  // Decedent node at center top
  nodes.push({
    id: decedent.id,
    type: 'person',
    position: { x: 0, y: 0 },
    data: {
      name: decedent.name || '(未命名)',
      relation: '配偶' as const, // placeholder
      status: '死亡' as const,
      deathDate: decedent.deathDate,
      isDecedent: true,
      isSelected: false,
      onSelect,
      onDelete,
    } satisfies PersonNodeData,
  });

  // Group persons by relation type for layout
  const spouse = persons.find(p => p.relation === '配偶');
  const children = persons.filter(p => p.relation === '子女' && p.status !== '代位繼承' && p.status !== '再轉繼承');
  const parents = persons.filter(p => p.relation === '父' || p.relation === '母');
  const siblings = persons.filter(p => p.relation === '兄弟姊妹');
  const grandparents = persons.filter(p => ['祖父', '祖母', '外祖父', '外祖母'].includes(p.relation));
  const subHeirs = persons.filter(p => p.status === '代位繼承' || (p.status === '再轉繼承' && p.parentId));

  // Helper: create a person node
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
        onSelect,
        onDelete,
      } satisfies PersonNodeData,
    });
  }

  // Layout: spouse to the left of decedent
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

  // Layout: parents above decedent
  const parentY = -(NODE_HEIGHT + V_GAP);
  const parentStartX = -((parents.length - 1) * (NODE_WIDTH + H_GAP)) / 2;
  parents.forEach((p, i) => {
    const x = parentStartX + i * (NODE_WIDTH + H_GAP);
    addPersonNode(p, x, parentY);
    edges.push({
      id: `e-${p.id}-${decedent.id}`,
      source: p.id,
      target: decedent.id,
    });
  });

  // Layout: children below decedent
  const childY = NODE_HEIGHT + V_GAP;
  const childStartX = -((children.length - 1) * (NODE_WIDTH + H_GAP)) / 2;
  children.forEach((child, i) => {
    const x = childStartX + i * (NODE_WIDTH + H_GAP);
    addPersonNode(child, x, childY);
    edges.push({
      id: `e-${decedent.id}-${child.id}`,
      source: decedent.id,
      target: child.id,
    });

    // Sub-heirs (代位/再轉) below the child they represent
    const childSubHeirs = subHeirs.filter(s => s.parentId === child.id);
    const subY = childY + NODE_HEIGHT + V_GAP;
    const subStartX = x - ((childSubHeirs.length - 1) * (NODE_WIDTH + H_GAP)) / 2;
    childSubHeirs.forEach((sub, j) => {
      const sx = subStartX + j * (NODE_WIDTH + H_GAP);
      addPersonNode(sub, sx, subY);
      edges.push({
        id: `e-${child.id}-${sub.id}`,
        source: child.id,
        target: sub.id,
        style: sub.status === '代位繼承' ? { strokeDasharray: '5,5' } : undefined,
      });
    });
  });

  // Layout: siblings to the right of decedent
  siblings.forEach((sib, i) => {
    const x = NODE_WIDTH + H_GAP * 2 + (spouse ? NODE_WIDTH + H_GAP : 0);
    const y = i * (NODE_HEIGHT + V_GAP / 2);
    addPersonNode(sib, x, y);
    edges.push({
      id: `e-${decedent.id}-${sib.id}`,
      source: decedent.id,
      target: sib.id,
    });
  });

  // Layout: grandparents above parents
  const gpY = parentY - NODE_HEIGHT - V_GAP;
  const gpStartX = -((grandparents.length - 1) * (NODE_WIDTH + H_GAP)) / 2;
  grandparents.forEach((gp, i) => {
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

**Step 3: Create FamilyTree component**

Create `src/components/FamilyTree.tsx`:
```typescript
import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useInheritance } from '../context/InheritanceContext';
import { PersonNode } from './PersonNode';
import { buildTreeLayout } from '../lib/tree-layout';

const nodeTypes: NodeTypes = {
  person: PersonNode,
};

export function FamilyTree() {
  const { state, dispatch } = useInheritance();

  const onSelect = useCallback(
    (id: string) => dispatch({ type: 'SELECT_PERSON', payload: { id } }),
    [dispatch],
  );

  const onDelete = useCallback(
    (id: string) => dispatch({ type: 'DELETE_PERSON', payload: { id } }),
    [dispatch],
  );

  const { nodes, edges } = useMemo(
    () =>
      buildTreeLayout(
        state.decedent,
        state.persons,
        state.results,
        state.selectedPersonId,
        onSelect,
        onDelete,
      ),
    [state.decedent, state.persons, state.results, state.selectedPersonId, onSelect, onDelete],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}
```

**Step 4: Wire FamilyTree into App.tsx**

Replace the placeholder in `src/App.tsx` main area:
```typescript
import { InheritanceProvider } from './context/InheritanceContext';
import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { FamilyTree } from './components/FamilyTree';
import { ExportToolbar } from './components/ExportToolbar';

export default function App() {
  return (
    <InheritanceProvider>
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <LeftPanel />
          <main className="flex-1">
            <FamilyTree />
          </main>
        </div>
        <ExportToolbar />
      </div>
    </InheritanceProvider>
  );
}
```

**Step 5: Verify app runs with family tree**

Run: `npm run dev`

Expected: Decedent node appears. Adding heirs via left panel creates nodes in the tree.

**Step 6: Commit**

```bash
git add src/components/PersonNode.tsx src/components/FamilyTree.tsx src/lib/tree-layout.ts src/App.tsx
git commit -m "feat: add React Flow family tree visualization with custom person nodes"
```

---

## Task 8: Node Editing Panel

When a user clicks a node, show an edit form in the left panel.

**Files:**
- Create: `src/components/PersonEditor.tsx`
- Modify: `src/components/LeftPanel.tsx`

**Step 1: Create PersonEditor component**

Create `src/components/PersonEditor.tsx`:
```typescript
import { useInheritance } from '../context/InheritanceContext';
import { INHERITANCE_STATUS_OPTIONS, RELATION_OPTIONS } from '../types/models';
import type { Person } from '../types/models';

export function PersonEditor() {
  const { state, dispatch } = useInheritance();

  if (!state.selectedPersonId) return null;

  const person = state.persons.find(p => p.id === state.selectedPersonId);
  if (!person) return null;

  function update(updates: Partial<Person>) {
    dispatch({ type: 'UPDATE_PERSON', payload: { id: person!.id, updates } });
  }

  return (
    <section className="p-4 border-b border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          編輯繼承人
        </h2>
        <button
          onClick={() => dispatch({ type: 'SELECT_PERSON', payload: { id: null } })}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          關閉
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-slate-600 mb-1">姓名</label>
          <input
            type="text"
            value={person.name}
            onChange={e => update({ name: e.target.value })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="請輸入姓名"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">稱謂</label>
          <select
            value={person.relation}
            onChange={e => update({ relation: e.target.value as Person['relation'] })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {RELATION_OPTIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">繼承狀態</label>
          <select
            value={person.status}
            onChange={e => update({ status: e.target.value as Person['status'] })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {INHERITANCE_STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {(person.status === '代位繼承' || (person.status === '再轉繼承' && person.relation !== '配偶')) && (
          <div>
            <label className="block text-sm text-slate-600 mb-1">被代位/再轉者</label>
            <select
              value={person.parentId || ''}
              onChange={e => update({ parentId: e.target.value || undefined })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">請選擇</option>
              {state.persons
                .filter(p => p.id !== person.id && (p.status === '死亡' || p.status === '再轉繼承'))
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name || '(未命名)'}</option>
                ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-600 mb-1">出生日期</label>
          <input
            type="date"
            value={person.birthDate || ''}
            onChange={e => update({ birthDate: e.target.value || undefined })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">死亡日期</label>
          <input
            type="date"
            value={person.deathDate || ''}
            onChange={e => update({ deathDate: e.target.value || undefined })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">結婚日期</label>
          <input
            type="date"
            value={person.marriageDate || ''}
            onChange={e => update({ marriageDate: e.target.value || undefined })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-600 mb-1">離婚日期</label>
          <input
            type="date"
            value={person.divorceDate || ''}
            onChange={e => update({ divorceDate: e.target.value || undefined })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => dispatch({ type: 'DELETE_PERSON', payload: { id: person.id } })}
          className="w-full mt-2 px-3 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
        >
          刪除此繼承人
        </button>
      </div>
    </section>
  );
}
```

**Step 2: Add PersonEditor to LeftPanel**

Modify `src/components/LeftPanel.tsx` to insert `<PersonEditor />` between the "Add Heir" section and the "Results" section. Import it at the top:
```typescript
import { PersonEditor } from './PersonEditor';
```

Insert after the "新增繼承人" section closing tag:
```tsx
{/* Person Editor */}
<PersonEditor />
```

**Step 3: Verify editing works**

Run: `npm run dev`

Expected: Click a node in the tree → editor appears in left panel → changes update the node card in real time.

**Step 4: Commit**

```bash
git add src/components/PersonEditor.tsx src/components/LeftPanel.tsx
git commit -m "feat: add person editor panel for editing heir details"
```

---

## Task 9: Excel Export & Import

**Files:**
- Create: `src/lib/excel.ts`
- Create: `src/lib/__tests__/excel.test.ts`
- Modify: `src/components/ExportToolbar.tsx`

**Step 1: Write tests for Excel serialization/deserialization**

Create `src/lib/__tests__/excel.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { toExcelData, fromExcelData } from '../excel';
import type { Decedent, Person } from '../../types/models';

describe('Excel data conversion', () => {
  const decedent: Decedent = { id: 'D', name: '王大明', deathDate: '2024-01-01' };
  const persons: Person[] = [
    { id: '1', name: '王太太', relation: '配偶', status: '一般繼承', marriageDate: '1990-06-01' },
    { id: '2', name: '王小明', relation: '子女', status: '一般繼承', birthDate: '1995-01-01' },
  ];

  it('converts to Excel row format', () => {
    const rows = toExcelData(decedent, persons);
    expect(rows.length).toBe(2);
    expect(rows[0]['繼承人']).toBe('王太太');
    expect(rows[0]['稱謂']).toBe('配偶');
    expect(rows[1]['繼承人']).toBe('王小明');
  });

  it('roundtrips through Excel format', () => {
    const rows = toExcelData(decedent, persons);
    const { decedent: d, persons: p } = fromExcelData(rows);
    expect(p.length).toBe(2);
    expect(p[0].name).toBe('王太太');
    expect(p[0].relation).toBe('配偶');
    expect(p[1].name).toBe('王小明');
  });
});
```

**Step 2: Run to verify fail**

Run: `npx vitest run src/lib/__tests__/excel.test.ts`

Expected: FAIL.

**Step 3: Implement Excel utilities**

Create `src/lib/excel.ts`:
```typescript
import * as XLSX from 'xlsx';
import type { Person, Decedent, Relation, InheritanceStatus } from '../types/models';

interface ExcelRow {
  編號: number;
  稱謂: string;
  繼承人: string;
  被繼承人: string;
  繼承狀態: string;
  出生日期: string;
  死亡日期: string;
  結婚日期: string;
  離婚日期: string;
}

export function toExcelData(decedent: Decedent, persons: Person[]): ExcelRow[] {
  return persons.map((p, i) => ({
    編號: i + 1,
    稱謂: p.relation,
    繼承人: p.name,
    被繼承人: decedent.name,
    繼承狀態: p.status,
    出生日期: p.birthDate || '',
    死亡日期: p.deathDate || '',
    結婚日期: p.marriageDate || '',
    離婚日期: p.divorceDate || '',
  }));
}

export function fromExcelData(rows: ExcelRow[]): { decedent: Decedent; persons: Person[] } {
  const decedentName = rows[0]?.被繼承人 || '';
  const persons: Person[] = rows.map((row, i) => ({
    id: `imported_${i}`,
    name: row.繼承人 || '',
    relation: (row.稱謂 || '子女') as Relation,
    status: (row.繼承狀態 || '一般繼承') as InheritanceStatus,
    birthDate: row.出生日期 || undefined,
    deathDate: row.死亡日期 || undefined,
    marriageDate: row.結婚日期 || undefined,
    divorceDate: row.離婚日期 || undefined,
  }));
  return {
    decedent: { id: 'decedent', name: decedentName },
    persons,
  };
}

export function exportToExcel(decedent: Decedent, persons: Person[]) {
  const data = toExcelData(decedent, persons);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '繼承系統表');
  XLSX.writeFile(wb, `繼承系統表_${decedent.name || '未命名'}.xlsx`);
}

export function importFromExcel(file: File): Promise<{ decedent: Decedent; persons: Person[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws);
        resolve(fromExcelData(rows));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
```

**Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/excel.test.ts`

Expected: All tests PASS.

**Step 5: Wire Excel buttons into ExportToolbar**

Update `src/components/ExportToolbar.tsx` to call the export/import functions using the context state. Add a hidden file input for import.

**Step 6: Commit**

```bash
git add src/lib/excel.ts src/lib/__tests__/excel.test.ts src/components/ExportToolbar.tsx
git commit -m "feat: add Excel export and import functionality"
```

---

## Task 10: PDF Export & Print

**Files:**
- Create: `src/lib/pdf-export.ts`
- Modify: `src/components/ExportToolbar.tsx`

**Step 1: Implement PDF export**

Create `src/lib/pdf-export.ts`:
```typescript
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportToPdf(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element #${elementId} not found`);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}

export function printPage() {
  window.print();
}
```

**Step 2: Add print CSS**

Add print-specific styles to `src/index.css`:
```css
@media print {
  .no-print { display: none !important; }
}
```

**Step 3: Wire PDF and print buttons into ExportToolbar**

Update ExportToolbar to call `exportToPdf` and `printPage`.

**Step 4: Add chart PNG export**

Add a function to export the React Flow canvas to PNG using `toObject()` and `html2canvas`.

**Step 5: Verify all exports work**

Run: `npm run dev`

Test each export button manually.

**Step 6: Commit**

```bash
git add src/lib/pdf-export.ts src/index.css src/components/ExportToolbar.tsx
git commit -m "feat: add PDF export, print, and chart PNG export"
```

---

## Task 11: Responsive Design

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/LeftPanel.tsx`
- Modify: `src/components/ExportToolbar.tsx`

**Step 1: Add responsive breakpoints**

Update `src/App.tsx` layout to use Tailwind responsive classes:
- `lg:flex-row flex-col` for the main content area
- Left panel: `lg:w-80 w-full` with collapse toggle on mobile
- Export toolbar: horizontal scroll on mobile

**Step 2: Add mobile toggle for left panel**

Add a hamburger button in the header that toggles the left panel on mobile.

**Step 3: Verify at each breakpoint**

Run: `npm run dev`

Test at desktop (1280px), tablet (768px), and mobile (375px) widths.

**Step 4: Commit**

```bash
git add src/App.tsx src/components/LeftPanel.tsx src/components/ExportToolbar.tsx src/components/Header.tsx
git commit -m "feat: add responsive design for tablet and mobile"
```

---

## Task 12: Final Integration Testing & Build

**Files:**
- Modify: `src/lib/__tests__/inheritance.test.ts` (add more edge cases if discovered)

**Step 1: Run full test suite**

Run: `npx vitest run`

Expected: All tests PASS.

**Step 2: Build for production**

Run: `npm run build`

Expected: Build succeeds, output in `dist/` directory.

**Step 3: Preview production build**

Run: `npm run preview`

Verify everything works in the production build.

**Step 4: Verify static deployment**

```bash
ls -la dist/
```

Expected: `index.html`, `assets/` folder with JS/CSS bundles. These files can be copied directly to the internal web server.

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final integration testing and production build verification"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project Scaffolding | `vite.config.ts`, `package.json`, `tailwind.config.js` |
| 2 | Fraction Math Library | `src/lib/fraction.ts` + tests |
| 3 | Type Definitions | `src/types/models.ts` |
| 4 | Inheritance Calculation Engine | `src/lib/inheritance.ts` + tests |
| 5 | React Context State | `src/context/InheritanceContext.tsx` |
| 6 | App Shell & Layout | `src/App.tsx`, `Header`, `LeftPanel`, `ExportToolbar` |
| 7 | Family Tree (React Flow) | `FamilyTree.tsx`, `PersonNode.tsx`, `tree-layout.ts` |
| 8 | Node Editing Panel | `PersonEditor.tsx` |
| 9 | Excel Export & Import | `src/lib/excel.ts` + tests |
| 10 | PDF Export & Print | `src/lib/pdf-export.ts` |
| 11 | Responsive Design | Layout modifications |
| 12 | Final Integration & Build | Test suite + production build |

**Build order:** Tasks 1-4 are foundation (no UI). Tasks 5-8 build the interactive UI. Tasks 9-10 add export features. Tasks 11-12 polish and ship.

**Dependencies:** Task 2 before 4. Task 3 before 4. Task 4 before 5. Task 5 before 6-8. Task 6 before 7-8.
