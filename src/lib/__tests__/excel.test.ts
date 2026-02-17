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
    const { persons: p } = fromExcelData(rows);
    expect(p.length).toBe(2);
    expect(p[0].name).toBe('王太太');
    expect(p[0].relation).toBe('配偶');
    expect(p[1].name).toBe('王小明');
  });
});
