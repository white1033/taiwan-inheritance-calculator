import { describe, it, expect } from 'vitest';
import { computeAvailableStatuses } from '../status-options';
import type { Person, Decedent } from '../../types/models';

const decedent: Decedent = { id: 'D', name: '王大明', deathDate: '2024-01-01' };

describe('computeAvailableStatuses', () => {
  it('top-level non-配偶 person: excludes 代位繼承, includes 再轉繼承', () => {
    const p: Person = { id: '1', name: 'A', relation: '子女', status: '一般繼承' };
    const result = computeAvailableStatuses(p, [p], decedent);
    expect(result).toContain('一般繼承');
    expect(result).toContain('死亡');
    expect(result).toContain('拋棄繼承');
    expect(result).toContain('再轉繼承');
    expect(result).not.toContain('代位繼承');
  });

  it('top-level 兄弟姊妹: includes 再轉繼承', () => {
    const p: Person = { id: '1', name: 'A', relation: '兄弟姊妹', status: '一般繼承' };
    const result = computeAvailableStatuses(p, [p], decedent);
    expect(result).toContain('再轉繼承');
    expect(result).not.toContain('代位繼承');
  });

  it('top-level 配偶: excludes both 代位繼承 and 再轉繼承', () => {
    const p: Person = { id: '1', name: '配偶', relation: '配偶', status: '一般繼承' };
    const result = computeAvailableStatuses(p, [p], decedent);
    expect(result).not.toContain('代位繼承');
    expect(result).not.toContain('再轉繼承');
  });

  it('top-level person includes 再轉繼承 (origin case)', () => {
    const p: Person = { id: '1', name: 'A', relation: '子女', status: '再轉繼承' };
    const result = computeAvailableStatuses(p, [p], decedent);
    expect(result).toContain('再轉繼承');
  });

  it('sub-heir with 死亡 parent (before decedent) → 代位繼承, 死亡絕嗣, 拋棄繼承', () => {
    const parent: Person = { id: 'p', name: '父', relation: '子女', status: '死亡', deathDate: '2023-06-01' };
    const child: Person = { id: 'c', name: '子', relation: '子女', status: '代位繼承', parentId: 'p' };
    const result = computeAvailableStatuses(child, [parent, child], decedent);
    expect(result).toEqual(['代位繼承', '死亡絕嗣', '拋棄繼承']);
  });

  it('sub-heir with 死亡 parent (same day as decedent) → 代位繼承', () => {
    const parent: Person = { id: 'p', name: '父', relation: '子女', status: '死亡', deathDate: '2024-01-01' };
    const child: Person = { id: 'c', name: '子', relation: '子女', status: '代位繼承', parentId: 'p' };
    const result = computeAvailableStatuses(child, [parent, child], decedent);
    expect(result).toContain('代位繼承');
    expect(result).not.toContain('再轉繼承');
  });

  it('sub-heir with 死亡 parent (after decedent) → 再轉繼承, 拋棄繼承', () => {
    const parent: Person = { id: 'p', name: '父', relation: '子女', status: '死亡', deathDate: '2024-06-01' };
    const child: Person = { id: 'c', name: '子', relation: '子女', status: '再轉繼承', parentId: 'p' };
    const result = computeAvailableStatuses(child, [parent, child], decedent);
    expect(result).toEqual(['再轉繼承', '拋棄繼承']);
  });

  it('sub-heir with 代位繼承 parent → 代位繼承, 死亡絕嗣, 拋棄繼承', () => {
    const grandparent: Person = { id: 'gp', name: '祖', relation: '子女', status: '死亡', deathDate: '2023-01-01' };
    const parent: Person = { id: 'p', name: '父', relation: '子女', status: '代位繼承', parentId: 'gp' };
    const child: Person = { id: 'c', name: '子', relation: '子女', status: '代位繼承', parentId: 'p' };
    const result = computeAvailableStatuses(child, [grandparent, parent, child], decedent);
    expect(result).toContain('代位繼承');
    expect(result).not.toContain('再轉繼承');
    expect(result).not.toContain('一般繼承');
  });

  it('sub-heir with 再轉繼承 parent → 再轉繼承, 拋棄繼承', () => {
    const parent: Person = { id: 'p', name: '父', relation: '子女', status: '再轉繼承', deathDate: '2024-06-01' };
    const child: Person = { id: 'c', name: '子', relation: '子女', status: '再轉繼承', parentId: 'p' };
    const result = computeAvailableStatuses(child, [parent, child], decedent);
    expect(result).toEqual(['再轉繼承', '拋棄繼承']);
  });

  it('子女之配偶 → only 再轉繼承', () => {
    const parent: Person = { id: 'p', name: '父', relation: '子女', status: '死亡', deathDate: '2024-06-01' };
    const spouse: Person = { id: 's', name: '媳婦', relation: '子女之配偶', status: '再轉繼承', parentId: 'p' };
    const result = computeAvailableStatuses(spouse, [parent, spouse], decedent);
    expect(result).toEqual(['再轉繼承']);
  });

  it('backward compat: current status not in list → prepended', () => {
    // Old URL-loaded state: 死亡 + parentId (parent died before decedent)
    const parent: Person = { id: 'p', name: '父', relation: '子女', status: '死亡', deathDate: '2023-06-01' };
    const child: Person = { id: 'c', name: '子', relation: '子女', status: '死亡', parentId: 'p' };
    const result = computeAvailableStatuses(child, [parent, child], decedent);
    expect(result[0]).toBe('死亡');
    expect(result).toContain('代位繼承');
  });

  it('no parent deathDate with 死亡 parent → treat as before decedent (代位繼承)', () => {
    const parent: Person = { id: 'p', name: '父', relation: '子女', status: '死亡' };
    const child: Person = { id: 'c', name: '子', relation: '子女', status: '代位繼承', parentId: 'p' };
    const result = computeAvailableStatuses(child, [parent, child], decedent);
    expect(result).toContain('代位繼承');
  });

  it('top-level person includes 死亡絕嗣', () => {
    const p: Person = { id: '1', name: 'A', relation: '子女', status: '一般繼承' };
    const result = computeAvailableStatuses(p, [p], decedent);
    expect(result).toContain('死亡絕嗣');
  });

  it('子女之配偶 with stale status → still only 再轉繼承 (no backward compat)', () => {
    const parent: Person = { id: 'p', name: '父', relation: '子女', status: '死亡', deathDate: '2024-06-01' };
    const spouse: Person = { id: 's', name: '媳婦', relation: '子女之配偶', status: '一般繼承', parentId: 'p' };
    const result = computeAvailableStatuses(spouse, [parent, spouse], decedent);
    expect(result).toEqual(['再轉繼承']);
  });

  it('sub-heir with non-existent parentId → fallback list', () => {
    const child: Person = { id: 'c', name: '子', relation: '子女', status: '代位繼承', parentId: 'does-not-exist' };
    const result = computeAvailableStatuses(child, [child], decedent);
    expect(result).toContain('代位繼承');
    expect(result).toContain('再轉繼承');
  });

  it('decedent without deathDate → treats 死亡 parent as before decedent', () => {
    const decedentNoDeath: Decedent = { id: 'D', name: '王大明' };
    const parent: Person = { id: 'p', name: '父', relation: '子女', status: '死亡', deathDate: '2024-06-01' };
    const child: Person = { id: 'c', name: '子', relation: '子女', status: '代位繼承', parentId: 'p' };
    const result = computeAvailableStatuses(child, [parent, child], decedentNoDeath);
    expect(result).toContain('代位繼承');
    expect(result).not.toContain('再轉繼承');
  });
});
