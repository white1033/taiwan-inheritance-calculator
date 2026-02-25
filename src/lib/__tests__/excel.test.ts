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

  it('roundtrips parentId through Excel format', () => {
    const personsWithParent: Person[] = [
      { id: 'A', name: '王大哥', relation: '子女', status: '死亡', birthDate: '1990-01-01' },
      { id: 'B', name: '王小孫', relation: '子女', status: '代位繼承', birthDate: '2015-01-01', parentId: 'A' },
    ];
    const rows = toExcelData(decedent, personsWithParent);
    // Parent is row 1 (編號 1), so 被代位者 should be 1
    expect(rows[1]['被代位者']).toBe(1);
    expect(rows[0]['被代位者']).toBe('');

    const { persons: imported } = fromExcelData(rows);
    // imported[1].parentId should reference imported[0] => 'imported_0'
    expect(imported[1].parentId).toBe('imported_0');
    expect(imported[0].parentId).toBeUndefined();
  });

  it('roundtrips decedent deathDate through Excel format', () => {
    const rows = toExcelData(decedent, persons);
    // Every row should carry the decedent's death date
    expect(rows[0]['被繼承人死亡日期']).toBe('2024-01-01');
    expect(rows[1]['被繼承人死亡日期']).toBe('2024-01-01');

    const { decedent: importedDecedent } = fromExcelData(rows);
    expect(importedDecedent.deathDate).toBe('2024-01-01');
  });

  it('preserves deathDate as undefined when decedent has no deathDate', () => {
    const decedentNoDate: Decedent = { id: 'D', name: '王大明' };
    const rows = toExcelData(decedentNoDate, persons);
    expect(rows[0]['被繼承人死亡日期']).toBe('');

    const { decedent: importedDecedent } = fromExcelData(rows);
    expect(importedDecedent.deathDate).toBeUndefined();
  });

  it('roundtrips estateAmount through Excel format', () => {
    const decedentWithEstate: Decedent = { id: 'D', name: '王大明', deathDate: '2024-01-01', estateAmount: 10000000 };
    const rows = toExcelData(decedentWithEstate, persons);
    expect(rows[0]['遺產總額']).toBe(10000000);

    const { decedent: importedDecedent } = fromExcelData(rows);
    expect(importedDecedent.estateAmount).toBe(10000000);
  });

  it('preserves estateAmount as undefined when not set', () => {
    const rows = toExcelData(decedent, persons);
    expect(rows[0]['遺產總額']).toBe('');

    const { decedent: importedDecedent } = fromExcelData(rows);
    expect(importedDecedent.estateAmount).toBeUndefined();
  });

  it('escapes formula injection in names starting with =, +, -, @', () => {
    const dangerousPersons: Person[] = [
      { id: '1', name: '=HYPERLINK("http://evil.com")', relation: '子女', status: '一般繼承' },
      { id: '2', name: '+cmd|/C calc', relation: '子女', status: '一般繼承' },
      { id: '3', name: '-1+1', relation: '子女', status: '一般繼承' },
      { id: '4', name: '@SUM(A1:A10)', relation: '子女', status: '一般繼承' },
      { id: '5', name: '正常名字', relation: '子女', status: '一般繼承' },
    ];
    const rows = toExcelData(decedent, dangerousPersons);
    expect(rows[0]['繼承人']).toBe("'=HYPERLINK(\"http://evil.com\")");
    expect(rows[1]['繼承人']).toBe("'+cmd|/C calc");
    expect(rows[2]['繼承人']).toBe("'-1+1");
    expect(rows[3]['繼承人']).toBe("'@SUM(A1:A10)");
    expect(rows[4]['繼承人']).toBe('正常名字');
  });

  it('strips formula escape prefix on re-import', () => {
    const dangerousPersons: Person[] = [
      { id: '1', name: '=SUM(A1)', relation: '子女', status: '一般繼承' },
      { id: '2', name: '+cmd', relation: '子女', status: '一般繼承' },
      { id: '3', name: '正常', relation: '子女', status: '一般繼承' },
    ];
    const rows = toExcelData(decedent, dangerousPersons);
    // Export escapes them
    expect(rows[0]['繼承人']).toBe("'=SUM(A1)");
    expect(rows[1]['繼承人']).toBe("'+cmd");
    // Re-import should strip the escape
    const { persons: imported } = fromExcelData(rows);
    expect(imported[0].name).toBe('=SUM(A1)');
    expect(imported[1].name).toBe('+cmd');
    expect(imported[2].name).toBe('正常');
  });

  it('ignores out-of-range parentId references', () => {
    const rowsWithBadRef = [
      {
        編號: 1,
        稱謂: '子女',
        繼承人: '測試人',
        被繼承人: '被繼承人',
        繼承狀態: '代位繼承',
        被代位者: 999 as string | number,
        出生日期: '',
        死亡日期: '',
        結婚日期: '',
        離婚日期: '',
        被繼承人死亡日期: '',
        遺產總額: '',
      },
    ];
    const { persons: imported } = fromExcelData(rowsWithBadRef);
    expect(imported[0].parentId).toBeUndefined();
  });

  it('falls back to defaults for invalid relation and status values', () => {
    const invalidRows = [
      {
        編號: 1,
        稱謂: '無效稱謂',
        繼承人: '測試人',
        被繼承人: '被繼承人',
        繼承狀態: '無效狀態',
        被代位者: '' as string | number,
        出生日期: '',
        死亡日期: '',
        結婚日期: '',
        離婚日期: '',
        被繼承人死亡日期: '',
        遺產總額: '',
      },
    ];
    const { persons: imported } = fromExcelData(invalidRows);
    expect(imported[0].relation).toBe('子女');
    expect(imported[0].status).toBe('一般繼承');
  });
});
