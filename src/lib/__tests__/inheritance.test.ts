import { describe, it, expect } from 'vitest';
import { calculateShares, type CalculationResult } from '../inheritance';
import { frac, equals, toString } from '../fraction';
import type { Person, Decedent } from '../../types/models';

function expectShare(results: CalculationResult[], name: string, n: number, d: number) {
  const person = results.find(r => r.name === name);
  expect(person, `Person "${name}" not found in results`).toBeDefined();
  expect(
    equals(person!.inheritanceShare, frac(n, d)),
    `Expected ${name} share = ${n}/${d}, got ${toString(person!.inheritanceShare)}`
  ).toBe(true);
}

function expectReserved(results: CalculationResult[], name: string, n: number, d: number) {
  const person = results.find(r => r.name === name);
  expect(person, `Person "${name}" not found in results`).toBeDefined();
  expect(
    equals(person!.reservedShare, frac(n, d)),
    `Expected ${name} reserved = ${n}/${d}, got ${toString(person!.reservedShare)}`
  ).toBe(true);
}

const decedent: Decedent = { id: 'D', name: '被繼承人', deathDate: '2024-01-01' };

describe('calculateShares', () => {
  describe('Spouse + First Order (Children)', () => {
    it('spouse + 2 children: each gets 1/3', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 3);
      expectShare(results, '長子', 1, 3);
      expectShare(results, '次子', 1, 3);
    });

    it('spouse + 1 child: each gets 1/2', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '獨子', relation: '子女', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '獨子', 1, 2);
    });

    it('no spouse, 3 children: each gets 1/3', () => {
      const persons: Person[] = [
        { id: '1', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '2', name: '次子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '三子', relation: '子女', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '長子', 1, 3);
      expectShare(results, '次子', 1, 3);
      expectShare(results, '三子', 1, 3);
    });
  });

  describe('Spouse + Second Order (Parents)', () => {
    it('spouse + father + mother: spouse 1/2, each parent 1/4', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '父親', relation: '父', status: '一般繼承' },
        { id: '3', name: '母親', relation: '母', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '父親', 1, 4);
      expectShare(results, '母親', 1, 4);
    });
  });

  describe('Spouse + Third Order (Siblings)', () => {
    it('spouse + 2 siblings: spouse 1/2, each sibling 1/4', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '兄', relation: '兄弟姊妹', status: '一般繼承' },
        { id: '3', name: '姊', relation: '兄弟姊妹', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '兄', 1, 4);
      expectShare(results, '姊', 1, 4);
    });
  });

  describe('Spouse + Fourth Order (Grandparents)', () => {
    it('spouse + 2 grandparents: spouse 2/3, each grandparent 1/6', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '祖父A', relation: '祖父', status: '一般繼承' },
        { id: '3', name: '祖母A', relation: '祖母', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 2, 3);
      expectShare(results, '祖父A', 1, 6);
      expectShare(results, '祖母A', 1, 6);
    });
  });

  describe('Spouse Only', () => {
    it('spouse alone: gets 100%', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 1);
    });
  });

  describe('Renunciation (拋棄繼承)', () => {
    it('one child renounces: share redistributed to remaining', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '拋棄繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '長子', 1, 2);
      expectShare(results, '次子', 0, 1);
    });

    it('all children renounce: falls to second order (parents)', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '拋棄繼承' },
        { id: '3', name: '父親', relation: '父', status: '一般繼承' },
        { id: '4', name: '母親', relation: '母', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '長子', 0, 1);
      expectShare(results, '父親', 1, 4);
      expectShare(results, '母親', 1, 4);
    });
  });

  describe('Representation (代位繼承)', () => {
    it('one child dies, grandchildren represent: grandchildren split dead child share', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '死亡', deathDate: '2023-06-01' },
        { id: '4', name: '孫1', relation: '子女', status: '代位繼承', parentId: '3' },
        { id: '5', name: '孫2', relation: '子女', status: '代位繼承', parentId: '3' },
      ];
      // Spouse + 長子 + 次子(dead) = 3 slots = 1/3 each
      // 次子's 1/3 split between 孫1 and 孫2 = 1/6 each
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 3);
      expectShare(results, '長子', 1, 3);
      expectShare(results, '次子', 0, 1);
      expectShare(results, '孫1', 1, 6);
      expectShare(results, '孫2', 1, 6);
    });
  });

  describe('Re-transfer (再轉繼承)', () => {
    it('one child dies after decedent: child share goes to child own heirs', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '再轉繼承', deathDate: '2024-03-01' },
        { id: '4', name: '次子配偶', relation: '配偶', status: '再轉繼承', parentId: '3' },
        { id: '5', name: '孫1', relation: '子女', status: '再轉繼承', parentId: '3' },
        { id: '6', name: '孫2', relation: '子女', status: '再轉繼承', parentId: '3' },
      ];
      // Spouse + 長子 + 次子 = 3 slots = 1/3 each
      // 次子's 1/3 re-transferred to: 次子配偶, 孫1, 孫2 (3 people, equal) = 1/9 each
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 3);
      expectShare(results, '長子', 1, 3);
      expectShare(results, '次子', 0, 1);
      expectShare(results, '次子配偶', 1, 9);
      expectShare(results, '孫1', 1, 9);
      expectShare(results, '孫2', 1, 9);
    });
  });

  describe('Reserved Shares (特留分)', () => {
    it('calculates reserved shares for spouse + children', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      // Each gets 1/3 statutory, reserved = 1/2 of statutory = 1/6
      expectReserved(results, '配偶A', 1, 6);
      expectReserved(results, '長子', 1, 6);
      expectReserved(results, '次子', 1, 6);
    });

    it('calculates reserved shares for spouse + siblings', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '兄', relation: '兄弟姊妹', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      // Spouse = 1/2, reserved = 1/2 * 1/2 = 1/4
      // Sibling = 1/2, reserved = 1/2 * 1/3 = 1/6
      expectReserved(results, '配偶A', 1, 4);
      expectReserved(results, '兄', 1, 6);
    });
  });

  describe('Edge Cases', () => {
    it('no persons at all: returns empty array', () => {
      const results = calculateShares(decedent, []);
      expect(results).toEqual([]);
    });

    it('only non-inheriting persons (all renounced, no fallback): returns zero shares', () => {
      const persons: Person[] = [
        { id: '1', name: '長子', relation: '子女', status: '拋棄繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '長子', 0, 1);
    });
  });
});
