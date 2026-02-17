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
