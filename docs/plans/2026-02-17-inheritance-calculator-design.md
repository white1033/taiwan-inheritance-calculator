# Taiwan Inheritance Calculator - Design Document

## Overview

A modern web-based tool for calculating statutory inheritance shares (應繼分) and reserved shares (特留分) under Taiwan's Civil Code. Replaces the legacy Judicial Yuan inheritance system table (GDGT19) with an intuitive visual family tree interface.

## Target Users

- General public (non-legal background) who need to quickly calculate inheritance ratios
- Legal professionals (lawyers, scriveners) who need precise and complete functionality
- Government agency staff

## Deployment Constraints

- **Static files only** - no server-side runtime (Node.js, Python, etc.)
- Internal server accessible from external network
- Must work on modern browsers (Chrome, Edge)

## Tech Stack

| Category | Technology |
|----------|-----------|
| Build Tool | Vite |
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Family Tree | React Flow |
| Excel I/O | SheetJS (xlsx) |
| PDF Export | html2canvas + jsPDF |
| State Management | React Context |
| Testing | Vitest + React Testing Library |
| Fraction Math | Custom fraction utility (no floating point) |

Build output: static HTML/CSS/JS via `vite build`.

## Legal Rules (Taiwan Civil Code - Inheritance)

### Inheritance Order (Art. 1138)

Spouse is an unconditional heir. Other heirs follow this priority:

1. **First order**: Lineal descendants (children, grandchildren - closer degree first per Art. 1139)
2. **Second order**: Parents
3. **Third order**: Siblings
4. **Fourth order**: Grandparents

### Spouse's Statutory Share (Art. 1144)

| Inheriting With | Spouse Share | Others' Share |
|----------------|-------------|---------------|
| First order (children) | Equal share with all | Equal per capita |
| Second order (parents) | 1/2 | Remaining 1/2 split equally |
| Third order (siblings) | 1/2 | Remaining 1/2 split equally |
| Fourth order (grandparents) | 2/3 | Remaining 1/3 split equally |
| No other heirs | 100% | — |

### Same-Order Equal Division (Art. 1141)

Multiple heirs of the same order inherit equal shares (after deducting spouse's fixed share for orders 2-4).

### Inheritance by Representation (Art. 1140)

- Only applies to **first-order** heirs
- Only **lineal descendants** can represent
- Triggers: heir died or lost inheritance rights **before** the decedent
- Does NOT apply to renunciation of inheritance

### Re-transfer Inheritance

- Heir dies **after** the decedent (already acquired inheritance rights)
- Heir's own heirs (including spouse) inherit their share
- Differs from representation: spouse participates in distribution

### Renunciation of Inheritance (Art. 1174)

- Heir voluntarily gives up inheritance
- Share redistributed to other same-order heirs
- Cannot be represented by descendants

### Reserved Share (Art. 1223)

| Heir Type | Reserved Share |
|-----------|---------------|
| Lineal descendants | 1/2 of statutory share |
| Parents | 1/2 of statutory share |
| Spouse | 1/2 of statutory share |
| Siblings | 1/3 of statutory share |
| Grandparents | 1/3 of statutory share |

## Page Layout

Single-page application with left-right split:

```
+----------------------------------------------------+
|  Header: 繼承系統表計算工具                            |
+----------------------+-----------------------------+
|                      |                             |
|   Left Panel         |   Right Main Area           |
|   (Controls)         |   (Visual Family Tree)      |
|                      |                             |
|  +----------------+  |   +---------------------+   |
|  | Decedent Info   |  |   |                     |   |
|  | Name/Death Date |  |   |   Family Tree       |   |
|  +----------------+  |   |   (React Flow)       |   |
|                      |   |                     |   |
|  +----------------+  |   |   Click/drag to add  |   |
|  | Add Heir        |  |   |   heir nodes        |   |
|  | (Quick buttons) |  |   |                     |   |
|  +----------------+  |   +---------------------+   |
|                      |                             |
|  +----------------+  |                             |
|  | Results Summary |  |                             |
|  | (Share/Reserve) |  |                             |
|  +----------------+  |                             |
|                      |                             |
+----------------------+-----------------------------+
|  Footer: Export buttons (Print/Excel/PDF/Chart)     |
+----------------------------------------------------+
```

### Responsive Design

- Desktop (>=1024px): Side-by-side layout
- Tablet (768-1023px): Stacked (tree on top, panel below)
- Mobile (<768px): Full-screen tree + floating action buttons

## Family Tree Design

### Node Types & Colors

| Node Type | Color | Display Info |
|-----------|-------|-------------|
| Decedent | Dark gray | Name, death date |
| Spouse | Blue | Name, dates, share |
| Child (normal) | Green | Name, dates, share |
| Renounced | Red with strikethrough | Name, "renounced" label |
| Representation | Light green | Name, share, "representation" label |
| Deceased | Gray | Name, death date |
| Re-transfer | Orange | Name, share, "re-transfer" label |

### Node Card Content

Each node displays:
- Name and relation (title)
- Inheritance status
- Birth / death / marriage / divorce dates (dash if empty)
- Statutory share (fraction)
- Reserved share (fraction)

Status indicated by colored top border on the card.

### Connections

- Decedent <-> Spouse: Dashed line (marriage)
- Parent -> Child: Solid line downward
- Representation: Dashed arrow upward to represented person

### Interactions

1. **Add heir**: Left panel buttons by relation type -> node appears in correct position
2. **Click node**: Expands inline edit panel (name, relation, status, dates)
3. **Delete node**: X button on node or Delete key
4. **Auto-layout**: Tree automatically arranges by relationship structure

## Data Model

```typescript
type InheritanceStatus =
  | '一般繼承'
  | '死亡'
  | '死亡絕嗣'
  | '拋棄繼承'
  | '代位繼承'
  | '再轉繼承';

type Relation =
  | '配偶'
  | '子女'
  | '父' | '母'
  | '兄弟姊妹'
  | '祖父' | '祖母' | '外祖父' | '外祖母';

interface Person {
  id: string;
  name: string;
  relation: Relation;
  status: InheritanceStatus;
  birthDate?: string;
  deathDate?: string;
  marriageDate?: string;
  divorceDate?: string;
  parentId?: string;
  inheritanceShare?: Fraction;
  reservedShare?: Fraction;
}

interface Fraction {
  numerator: number;
  denominator: number;
}
```

## Calculation Engine

```
Input: Decedent + all related persons with statuses
  |
  v
Step 1: Determine active inheritance order
  - Check first order (children) for valid heirs
  - If none, check second order (parents), etc.
  |
  v
Step 2: Process special statuses
  - Renunciation: remove from heir list, redistribute
  - Death before decedent: check for representation heirs
  - Re-transfer: calculate re-transfer distribution
  |
  v
Step 3: Calculate spouse's share
  - Based on active inheritance order
  |
  v
Step 4: Calculate other heirs' shares
  - Deduct spouse's portion, divide equally
  - Representation heirs: split the represented person's share
  |
  v
Step 5: Calculate reserved shares
  - Apply reserved share ratios by relation type
  |
  v
Output: Each person's statutory share (Fraction) and reserved share (Fraction)
```

All arithmetic uses exact fraction operations (no floating point).

## Export Features

| Feature | Implementation | Output |
|---------|---------------|--------|
| Print | `window.print()` + print CSS | Family tree + share table |
| Excel Export | SheetJS (xlsx) client-side | Table format matching legacy system |
| Excel Import | SheetJS client-side parsing | Restore family tree from Excel |
| PDF Export | html2canvas + jsPDF | Family tree + results table |
| System Chart | Canvas export from React Flow | PNG family relationship diagram |

## Validation & Error Handling

| Validation | Handling |
|-----------|---------|
| Decedent not filled | Red prompt, block adding heirs |
| Heir name empty | Red border + "Please enter name" |
| Representation without target | Prompt to specify represented heir |
| All heirs renounced | Display "No valid heirs" message |
| Invalid date | Use date picker, prevent free text |
| No heirs at all | Spouse gets all; no spouse = "No statutory heirs" |

## References

- [Civil Code Art. 1138-1146 (National Law Database)](https://law.moj.gov.tw/LawClass/LawParaDeatil.aspx?pcode=B0000001&bp=126)
- [Legispedia - Inheritance Order & Statutory Share](https://www.legis-pedia.com/article/family-relationship/1036)
- [KPMG - Statutory Share & Reserved Share](https://kpmg.com/tw/zh/home/insights/2022/10/inheritance-law.html)
- [Anherit - Representation vs Re-transfer](https://rich99.tw/335/)
- [Judicial Yuan Legacy System (GDGT19)](https://gdgt.judicial.gov.tw/judtool/wkc/GDGT19.htm)
