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

  it('errors on circular parentId reference', () => {
    const persons: Person[] = [
      { id: '1', name: 'A', relation: '子女', status: '代位繼承', parentId: '2' },
      { id: '2', name: 'B', relation: '子女', status: '代位繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '1', 'parentId') || hasError(errors, '2', 'parentId')).toBe(true);
  });

  it('errors when representation heir parent is alive', () => {
    const persons: Person[] = [
      { id: '1', name: 'A', relation: '子女', status: '一般繼承' },
      { id: '2', name: 'B', relation: '子女', status: '代位繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '2', 'parentId')).toBe(true);
  });

  it('allows multiple spouses with divorceDate (only current spouse counts)', () => {
    const persons: Person[] = [
      { id: '1', name: '前妻', relation: '配偶', status: '一般繼承', divorceDate: '2020-01-01' },
      { id: '2', name: '現任', relation: '配偶', status: '一般繼承' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '2', 'relation')).toBe(false);
  });

  it('allows new spouse when existing spouse has status 死亡', () => {
    const persons: Person[] = [
      { id: '1', name: '前妻', relation: '配偶', status: '死亡', deathDate: '2020-01-01' },
      { id: '2', name: '現任', relation: '配偶', status: '一般繼承' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '2', 'relation')).toBe(false);
  });

  it('errors when two current spouses (no divorceDate)', () => {
    const persons: Person[] = [
      { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
      { id: '2', name: '配偶B', relation: '配偶', status: '一般繼承' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '2', 'relation')).toBe(true);
  });

  it('errors when representation heir parent is not first order', () => {
    const persons: Person[] = [
      { id: '1', name: '兄', relation: '兄弟姊妹', status: '死亡', deathDate: '2023-01-01' },
      { id: '2', name: '兄子', relation: '子女', status: '代位繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '2', 'status')).toBe(true);
  });

  it('errors when sub-heir has parent with 死亡絕嗣 status', () => {
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '死亡絕嗣', deathDate: '2023-01-01' },
      { id: '2', name: '孫A', relation: '子女', status: '代位繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '2', 'parentId')).toBe(true);
    expect(errors.some(e => e.personId === '2' && e.message.includes('死亡絕嗣'))).toBe(true);
  });

  it('errors when re-transfer heir parent has invalid status', () => {
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '一般繼承' },
      { id: '2', name: '孫A', relation: '子女', status: '再轉繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '2', 'parentId')).toBe(true);
    expect(errors.some(e => e.personId === '2' && e.message.includes('再轉繼承'))).toBe(true);
  });

  it('divorced spouse with 一般繼承 status does not produce validation error', () => {
    const persons: Person[] = [
      { id: '1', name: '前妻', relation: '配偶', status: '一般繼承', divorceDate: '2020-01-01' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '1', 'divorceDate')).toBe(false);
  });

  it('errors when representation heir parent is 配偶 (null order)', () => {
    const persons: Person[] = [
      { id: '1', name: '配偶', relation: '配偶', status: '死亡', deathDate: '2023-01-01' },
      { id: '2', name: '孫A', relation: '子女', status: '代位繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '2', 'status')).toBe(true);
  });

  it('errors when representation heir parent has 拋棄繼承 status', () => {
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '拋棄繼承' },
      { id: '2', name: '孫A', relation: '子女', status: '代位繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '2', 'parentId')).toBe(true);
  });

  it('errors when 再轉繼承 origin has no deathDate', () => {
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '再轉繼承' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '1', 'deathDate')).toBe(true);
  });

  it('no deathDate error for 再轉繼承 sub-heir (non-origin)', () => {
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '再轉繼承', deathDate: '2024-03-01' },
      { id: '2', name: '孫A', relation: '子女', status: '再轉繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    expect(errors.filter(e => e.personId === '2' && e.field === 'deathDate')).toHaveLength(0);
  });

  it('errors when 代位繼承 parent died after decedent', () => {
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '死亡', deathDate: '2024-06-01' },
      { id: '2', name: '孫A', relation: '子女', status: '代位繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    // 錯誤應報在代位繼承子嗣上（被代位者死亡日期晚於被繼承人）
    expect(hasError(errors, '2', 'status')).toBe(true);
    expect(errors.some(e => e.personId === '2' && e.message.includes('再轉繼承'))).toBe(true);
    // 死亡者本身不應因死亡日期晚於被繼承人而報錯
    expect(hasError(errors, '1', 'deathDate')).toBe(false);
  });

  it('no error for 死亡 status person who died after decedent (valid 再轉繼承 scenario)', () => {
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '死亡', deathDate: '2024-06-01' },
      { id: '2', name: '孫A', relation: '子女', status: '再轉繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '1', 'deathDate')).toBe(false);
  });

  it('errors when 再轉繼承 origin died before decedent', () => {
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '再轉繼承', deathDate: '2023-06-01' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '1', 'deathDate')).toBe(true);
    expect(errors.some(e => e.personId === '1' && e.message.includes('晚於'))).toBe(true);
  });

  it('errors when root 配偶 has parentId', () => {
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '死亡', deathDate: '2023-01-01' },
      { id: '2', name: '配偶', relation: '配偶', status: '代位繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '2', 'parentId')).toBe(true);
    expect(errors.some(e => e.personId === '2' && e.message.includes('配偶'))).toBe(true);
  });

  it('allows same-day death for 代位繼承 (boundary case)', () => {
    // deathDate === decedent.deathDate → 不報錯 (> 不含 =)
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '死亡', deathDate: '2024-01-01' },
      { id: '2', name: '孫A', relation: '子女', status: '代位繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    // 同一天死亡不觸發「應早於」錯誤
    expect(errors.filter(e => e.personId === '1' && e.field === 'deathDate' && e.message.includes('早於'))).toHaveLength(0);
  });

  it('errors for 再轉繼承 origin with same-day death as decedent', () => {
    // deathDate === decedent.deathDate → <= 觸發報錯
    const persons: Person[] = [
      { id: '1', name: '長子', relation: '子女', status: '再轉繼承', deathDate: '2024-01-01' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '1', 'deathDate')).toBe(true);
    expect(errors.some(e => e.personId === '1' && e.message.includes('晚於'))).toBe(true);
  });

  it('per-person current spouse uniqueness with parentId', () => {
    const persons: Person[] = [
      { id: '1', name: 'X', relation: '子女', status: '死亡', deathDate: '2023-01-01' },
      { id: '2', name: 'X配偶A', relation: '子女之配偶', status: '再轉繼承', parentId: '1' },
      { id: '3', name: 'X配偶B', relation: '子女之配偶', status: '再轉繼承', parentId: '1' },
    ];
    const errors = validate(persons, decedent);
    expect(hasError(errors, '3', 'relation')).toBe(true);
  });
});
