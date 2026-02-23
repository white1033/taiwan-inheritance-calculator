# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Taiwan inheritance calculator — computes legal inheritance shares (應繼分) and reserved shares (特留分) per Taiwan Civil Code. Interactive family tree editor with ReactFlow, calculation engine, and export capabilities. All UI is in Traditional Chinese (zh-TW).

## Commands

```bash
npm run dev          # Vite dev server with HMR
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint
npm test             # Vitest in watch mode
npm run test:run     # Vitest single run
npx vitest run src/lib/__tests__/inheritance.test.ts  # Run a single test file
```

## Architecture

### State Management

`src/context/InheritanceContext.tsx` — Redux-style `useReducer` with actions like `ADD_PERSON`, `UPDATE_PERSON`, `DELETE_PERSON`, `ADD_SUB_HEIR`. Results and validation errors are recomputed on every dispatch via `calculateShares()` and `validate()`.

### Calculation Engine (`src/lib/inheritance.ts`)

Implements Taiwan Civil Code inheritance rules:
- **4 inheritance orders** (Art. 1138): children → parents → siblings → grandparents
- **Spouse** has no order, always inherits with varying fixed share per active order (Art. 1144)
- **Representation inheritance** (代位繼承 Art. 1140): dead heir's descendants inherit their slot
- **Re-transfer inheritance** (再轉繼承): heir dies after decedent, own heirs inherit
- **Reserved shares** (特留分 Art. 1223): 1/2 for children/parents/spouse, 1/3 for siblings/grandparents
- Uses slot-based distribution — dead heirs with representation count as slots, shares recurse to children

### Fraction Library (`src/lib/fraction.ts`)

All share calculations use exact rational arithmetic (numerator/denominator with GCD reduction) to avoid floating-point errors. No decimals anywhere in the calculation pipeline.

### Tree Layout (`src/lib/tree-layout.ts`)

Custom layout algorithm for ReactFlow nodes. Decedent at center, spouse offset left, parents above, children below (recursive), siblings right. `subtreeWidth()` calculates space needed per subtree to center children under parents.

### Key Data Types (`src/types/models.ts`)

- `Person.parentId` — links sub-heirs (代位/再轉) to their dead parent heir
- `Person.status` — discriminates inheritance type: `一般繼承`, `死亡`, `拋棄繼承`, `代位繼承`, `再轉繼承`, `死亡絕嗣`
- `Person.relation` — one of: `配偶`, `子女`, `子女之配偶`, `父`, `母`, `兄弟姊妹`, `祖父`, `祖母`, `外祖父`, `外祖母`

### Component Structure

- `FamilyTree.tsx` — ReactFlow canvas with PersonNode custom nodes, edges styled by inheritance type (solid/dashed/dotted)
- `LeftPanel.tsx` — sidebar with decedent info, heir add buttons, PersonEditor form, results display
- `PersonNode.tsx` — node rendering with status-colored top bar, hover actions (+child/+spouse), delete
- `ExportToolbar.tsx` — print, Excel, PDF, PNG export (heavy libs loaded dynamically)

### Testing

Tests live in `src/lib/__tests__/`. Focus is on calculation correctness — inheritance scenarios, fraction arithmetic, validation rules, and Excel round-trip. Uses Vitest with JSDOM.

## Domain-Specific Notes

- Two sub-heir types share `parentId` but differ by `status`: 代位繼承 (parent died before decedent) vs 再轉繼承 (parent died after decedent)
- The `子女之配偶` relation is a display-only role for tree visualization — these persons do not participate in inheritance calculations
- Excel export escapes formula injection characters (`=`, `+`, `-`, `@`) in cell values
