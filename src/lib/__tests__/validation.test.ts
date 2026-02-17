import { describe, it, expect } from 'vitest';
import { validate, type ValidationError } from '../validation';
import type { Person, Decedent } from '../../types/models';

const decedent: Decedent = { id: 'D', name: '王大明', deathDate: '2024-01-01' };

function hasError(errors: ValidationError[], personId: string, field: string): boolean {
  return errors.some(e => e.personId === personId && e.field === field);
}

describe('validate', () => {
  it('returns no errors for valid data', () => {
    const persons: Person[] = [
      { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
      { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
    ];
    expect(validate(persons, decedent)).toEqual([]);
  });

  it('errors when name is empty', () => {
    const persons: Person[] = [
      { id: '1', name: '', relation: '子女', status: '一般繼承' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '1', 'name')).toBe(true);
  });

  it('errors when representation heir has no parentId', () => {
    const persons: Person[] = [
      { id: '1', name: '孫A', relation: '子女', status: '代位繼承' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '1', 'parentId')).toBe(true);
  });

  it('errors when dead heir has no deathDate', () => {
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '死亡' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '1', 'deathDate')).toBe(true);
  });

  it('errors when 死亡絕嗣 heir has no deathDate', () => {
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '死亡絕嗣' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '1', 'deathDate')).toBe(true);
  });

  it('errors when duplicate spouses exist', () => {
    const persons: Person[] = [
      { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
      { id: '2', name: '配偶B', relation: '配偶', status: '一般繼承' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '2', 'relation')).toBe(true);
  });

  it('errors when parentId references non-existent person', () => {
    const persons: Person[] = [
      { id: '1', name: '孫A', relation: '子女', status: '代位繼承', parentId: 'nonexistent' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '1', 'parentId')).toBe(true);
  });

  it('no error for valid representation heir with parentId', () => {
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '死亡', deathDate: '2023-01-01' },
      { id: '2', name: '孫A', relation: '子女', status: '代位繼承', parentId: '1' },
    ];
    expect(validate(persons, decedent)).toEqual([]);
  });
});
