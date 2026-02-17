# HIGH Priority Fixes Design

## Fix 1: Dead Heir Share Redistribution

**Problem:** When a deceased heir has no representation heirs, their slot is still counted in `totalSlots`, causing their share to vanish (shares don't sum to 1).

**Solution:** Exclude deceased heirs (status `死亡`/`死亡絕嗣`) from `slotHolders` if they have no corresponding representation heirs (`代位繼承`). Same logic for `再轉繼承` origin with no sub-heirs.

**Files:**
- Modify: `src/lib/inheritance.ts` — `slotHolders` filter condition
- Modify: `src/lib/__tests__/inheritance.test.ts` — add test cases

**Test cases:**
- Spouse + 3 children (1 dead, no descendants) → 3 people share equally (1/3 each)
- Spouse + 2 children (all dead, no descendants) → fallback to next order
- Existing representation tests still pass

---

## Fix 2: Form Validation

**Problem:** No input validation. Users can submit incomplete/invalid data (empty names, missing parentId for representation heirs, missing death dates).

**Solution:** Dual-layer validation — real-time in reducer + blocking on export.

**Architecture:**
- New file: `src/lib/validation.ts`
  - `validate(persons, decedent) → ValidationError[]`
  - `ValidationError = { personId: string; field: string; message: string }`
- Modify: `src/context/InheritanceContext.tsx` — add `validationErrors` to state, run `validate()` after each dispatch
- Modify: `src/components/PersonEditor.tsx` — show inline red error text per field
- Modify: `src/components/PersonNode.tsx` — red border on nodes with errors
- Modify: `src/components/ExportToolbar.tsx` — block export when errors exist

**Validation rules:**
1. Name must not be empty
2. At most one spouse
3. Representation heirs (`代位繼承`) must have `parentId` set
4. Re-transfer heirs (`再轉繼承` with parentId) must have `parentId` set
5. Dead/extinct status (`死亡`/`死亡絕嗣`) must have `deathDate`
6. `parentId` target must exist and be in dead status

---

## Fix 3: Bundle Code Splitting

**Problem:** Single JS chunk is 1,414 KB. Export-only dependencies (`xlsx`, `jspdf`, `html2canvas`) dominate the bundle but are only used on export button click.

**Solution:** Convert static imports to dynamic `import()` for export-related modules. Vite auto-splits dynamic imports into separate chunks.

**Files:**
- Modify: `src/lib/excel.ts` — `exportToExcel()` and `importFromExcel()` use `await import('xlsx')`
- Modify: `src/lib/pdf-export.ts` — use `await import('html2canvas')` and `await import('jspdf')`
- Modify: `src/components/ExportToolbar.tsx` — add loading state for export buttons

**Expected result:** Main chunk drops from ~1,414 KB to ~200 KB. Export dependencies load on-demand.
