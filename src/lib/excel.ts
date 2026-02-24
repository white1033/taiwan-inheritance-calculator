import type { Person, Decedent, Relation, InheritanceStatus } from '../types/models';
import { RELATION_OPTIONS, INHERITANCE_STATUS_OPTIONS } from '../types/models';

interface ExcelRow {
  編號: number;
  稱謂: string;
  繼承人: string;
  被繼承人: string;
  繼承狀態: string;
  被代位者: number | string;
  出生日期: string;
  死亡日期: string;
  結婚日期: string;
  離婚日期: string;
  被繼承人死亡日期: string;
}

const MAX_IMPORT_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Escape cell values that could be interpreted as formulas in spreadsheet apps.
 * Prefixes values starting with =, +, -, @, \t, or \r with a single quote.
 */
function escapeFormulaInjection(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return "'" + value;
  }
  return value;
}

/**
 * Sanitize filename by removing characters invalid on most filesystems.
 */
function sanitizeFilename(name: string): string {
  // eslint-disable-next-line no-control-regex -- intentional: strip control chars invalid on most filesystems
  return name.replace(/[/\\:*?"<>|\x00-\x1f]/g, '_');
}

export function toExcelData(decedent: Decedent, persons: Person[]): ExcelRow[] {
  return persons.map((p, i) => {
    let parentRef: number | string = '';
    if (p.parentId) {
      const parentIndex = persons.findIndex((pp) => pp.id === p.parentId);
      if (parentIndex >= 0) {
        parentRef = parentIndex + 1; // 編號 is 1-based
      }
    }
    return {
      編號: i + 1,
      稱謂: p.relation,
      繼承人: escapeFormulaInjection(p.name),
      被繼承人: escapeFormulaInjection(decedent.name),
      繼承狀態: p.status,
      被代位者: parentRef,
      出生日期: p.birthDate || '',
      死亡日期: p.deathDate || '',
      結婚日期: p.marriageDate || '',
      離婚日期: p.divorceDate || '',
      被繼承人死亡日期: decedent.deathDate || '',
    };
  });
}

export function fromExcelData(rows: ExcelRow[]): { decedent: Decedent; persons: Person[] } {
  const decedentName = rows[0]?.被繼承人 || '';
  const decedentDeathDate = rows[0]?.被繼承人死亡日期 || undefined;
  const persons: Person[] = rows.map((row, i) => {
    const parentRefValue = row.被代位者;
    let parentId: string | undefined;
    if (parentRefValue !== '' && parentRefValue != null) {
      const parentNum = Number(parentRefValue);
      if (!isNaN(parentNum) && parentNum >= 1) {
        parentId = `imported_${parentNum - 1}`;
      }
    }
    return {
      id: `imported_${i}`,
      name: row.繼承人 || '',
      relation: RELATION_OPTIONS.includes(row.稱謂 as Relation) ? (row.稱謂 as Relation) : '子女',
      status: INHERITANCE_STATUS_OPTIONS.includes(row.繼承狀態 as InheritanceStatus) ? (row.繼承狀態 as InheritanceStatus) : '一般繼承',
      birthDate: row.出生日期 || undefined,
      deathDate: row.死亡日期 || undefined,
      marriageDate: row.結婚日期 || undefined,
      divorceDate: row.離婚日期 || undefined,
      parentId,
    };
  });
  return {
    decedent: { id: 'decedent', name: decedentName, deathDate: decedentDeathDate },
    persons,
  };
}

export async function exportToExcel(decedent: Decedent, persons: Person[]) {
  const XLSX = await import('xlsx');
  const data = toExcelData(decedent, persons);
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '繼承系統表');
  const safeName = sanitizeFilename(decedent.name || '未命名');
  XLSX.writeFile(wb, `繼承系統表_${safeName}.xlsx`);
}

export async function importFromExcel(file: File): Promise<{ decedent: Decedent; persons: Person[] }> {
  if (file.size > MAX_IMPORT_SIZE) {
    throw new Error(`檔案大小超過限制（最大 ${MAX_IMPORT_SIZE / 1024 / 1024} MB）`);
  }
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws);
  return fromExcelData(rows);
}
