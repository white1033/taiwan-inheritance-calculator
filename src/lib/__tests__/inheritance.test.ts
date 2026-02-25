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

    it('dead child with no representation heirs: share redistributed to others', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '死亡', deathDate: '2023-06-01' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '長子', 1, 2);
      expectShare(results, '次子', 0, 1);
    });

    it('all children dead with no representation: falls to next order', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '死亡', deathDate: '2023-01-01' },
        { id: '3', name: '次子', relation: '子女', status: '死亡絕嗣', deathDate: '2023-02-01' },
        { id: '4', name: '父親', relation: '父', status: '一般繼承' },
        { id: '5', name: '母親', relation: '母', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '長子', 0, 1);
      expectShare(results, '次子', 0, 1);
      expectShare(results, '父親', 1, 4);
      expectShare(results, '母親', 1, 4);
    });

    it('re-transfer origin with no sub-heirs: share redistributed to others', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶A', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '再轉繼承', deathDate: '2024-03-01' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶A', 1, 2);
      expectShare(results, '長子', 1, 2);
      expectShare(results, '次子', 0, 1);
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

  describe('Real-World Examples (from web sources)', () => {
    // 新北地方法院案例：甲有配偶乙，育有A、B、C三子，B先於甲死亡，遺有a、b二子
    // Source: https://pcd.judicial.gov.tw
    it('新北地院案例：配偶+3子(1死亡有2孫代位)', () => {
      const persons: Person[] = [
        { id: '1', name: '乙', relation: '配偶', status: '一般繼承' },
        { id: '2', name: 'A', relation: '子女', status: '一般繼承' },
        { id: '3', name: 'B', relation: '子女', status: '死亡', deathDate: '2023-06-01' },
        { id: '4', name: 'C', relation: '子女', status: '一般繼承' },
        { id: '5', name: 'a', relation: '子女', status: '代位繼承', parentId: '3' },
        { id: '6', name: 'b', relation: '子女', status: '代位繼承', parentId: '3' },
      ];
      // 乙、A、B、C = 4 slots，每人 1/4
      // B 死亡，其 1/4 由 a、b 代位，各得 1/8
      const results = calculateShares(decedent, persons);
      expectShare(results, '乙', 1, 4);
      expectShare(results, 'A', 1, 4);
      expectShare(results, 'B', 0, 1);
      expectShare(results, 'C', 1, 4);
      expectShare(results, 'a', 1, 8);
      expectShare(results, 'b', 1, 8);
    });

    // 屏東地政事務所案例：甲太太(配偶)、乙(長子已死)、丙(次子)
    // 乙有2子 乙1、乙2 代位繼承
    // Source: https://www.pthg.gov.tw/chaujou-land/
    it('屏東地政案例：配偶+2子(1死亡有2孫代位)', () => {
      const persons: Person[] = [
        { id: '1', name: '甲太太', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '乙', relation: '子女', status: '死亡', deathDate: '2023-01-01' },
        { id: '3', name: '丙', relation: '子女', status: '一般繼承' },
        { id: '4', name: '乙1', relation: '子女', status: '代位繼承', parentId: '2' },
        { id: '5', name: '乙2', relation: '子女', status: '代位繼承', parentId: '2' },
      ];
      // 甲太太、乙、丙 = 3 slots，每人 1/3
      // 乙死亡，其 1/3 由 乙1、乙2 代位，各得 1/6
      const results = calculateShares(decedent, persons);
      expectShare(results, '甲太太', 1, 3);
      expectShare(results, '乙', 0, 1);
      expectShare(results, '丙', 1, 3);
      expectShare(results, '乙1', 1, 6);
      expectShare(results, '乙2', 1, 6);
    });

    // 法律010案例：甲死亡，遺產2400萬，配偶乙＋子女丙、丁、戊(共4人)
    // 每人應繼分 = 1/4，特留分 = 1/8
    // Source: https://laws010.com
    it('法律010案例：配偶+3子女均分', () => {
      const persons: Person[] = [
        { id: '1', name: '乙', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '丙', relation: '子女', status: '一般繼承' },
        { id: '3', name: '丁', relation: '子女', status: '一般繼承' },
        { id: '4', name: '戊', relation: '子女', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '乙', 1, 4);
      expectShare(results, '丙', 1, 4);
      expectShare(results, '丁', 1, 4);
      expectShare(results, '戊', 1, 4);
      // 特留分 = 應繼分 × 1/2 = 1/8
      expectReserved(results, '乙', 1, 8);
      expectReserved(results, '丙', 1, 8);
      expectReserved(results, '丁', 1, 8);
      expectReserved(results, '戊', 1, 8);
    });

    // 配偶無後代，父母已逝，有1哥1妹
    // 配偶 1/2，哥哥 1/4，妹妹 1/4
    // Source: https://www.sinsiang.com.tw
    it('新享案例：配偶+兄弟姊妹(無子女無父母)', () => {
      const persons: Person[] = [
        { id: '1', name: '配偶', relation: '配偶', status: '一般繼承' },
        { id: '2', name: '哥哥', relation: '兄弟姊妹', status: '一般繼承' },
        { id: '3', name: '妹妹', relation: '兄弟姊妹', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶', 1, 2);
      expectShare(results, '哥哥', 1, 4);
      expectShare(results, '妹妹', 1, 4);
      // 配偶特留分 = 1/2 × 1/2 = 1/4
      // 兄弟姊妹特留分 = 1/4 × 1/3 = 1/12
      expectReserved(results, '配偶', 1, 4);
      expectReserved(results, '哥哥', 1, 12);
      expectReserved(results, '妹妹', 1, 12);
    });
  });

  describe('Multi-level Representation (多代代位繼承)', () => {
    it('grandchild represents dead child, great-grandchild represents dead grandchild', () => {
      // 配偶 + 子女B(死亡) + 子女G(alive)
      // B has: 孫C(死亡, 代位) + 孫D(alive, 代位)
      // C has: 曾孫F(代位)
      // Slots: 配偶 + B + G = 3, each 1/3
      // B(0) → C + D split B's 1/3 → each 1/6
      // C(0) → F gets C's 1/6
      const persons: Person[] = [
        { id: '1', name: '配偶', relation: '配偶', status: '一般繼承' },
        { id: '2', name: 'B', relation: '子女', status: '死亡', deathDate: '2023-01-01' },
        { id: '3', name: 'G', relation: '子女', status: '一般繼承' },
        { id: '4', name: 'C', relation: '子女', status: '代位繼承', parentId: '2', deathDate: '2023-02-01' },
        { id: '5', name: 'D', relation: '子女', status: '代位繼承', parentId: '2' },
        { id: '6', name: 'F', relation: '子女', status: '代位繼承', parentId: '4' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '配偶', 1, 3);
      expectShare(results, 'B', 0, 1);
      expectShare(results, 'G', 1, 3);
      expectShare(results, 'C', 0, 1);
      expectShare(results, 'D', 1, 6);
      expectShare(results, 'F', 1, 6);
    });

    it('3 levels deep: child → grandchild → great-grandchild', () => {
      // No spouse, child A(dead), grandchild B(dead, 代位 A), great-grandchild C(代位 B)
      // Only 1 slot (A), share = 1
      // A(0) → B(0) → C(1)
      const persons: Person[] = [
        { id: '1', name: 'A', relation: '子女', status: '死亡', deathDate: '2023-01-01' },
        { id: '2', name: 'B', relation: '子女', status: '代位繼承', parentId: '1', deathDate: '2023-02-01' },
        { id: '3', name: 'C', relation: '子女', status: '代位繼承', parentId: '2' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, 'A', 0, 1);
      expectShare(results, 'B', 0, 1);
      expectShare(results, 'C', 1, 1);
    });

    it('dead child with mixed sub-heirs: some alive, some dead with own sub-heirs', () => {
      // No spouse, 2 children: A(alive), B(dead)
      // B has: C(alive, 代位), D(dead, 代位)
      // D has: E(代位)
      // Slots: A + B = 2, each 1/2
      // B(0) → C(1/4), D(0) → E(1/4)
      const persons: Person[] = [
        { id: '1', name: 'A', relation: '子女', status: '一般繼承' },
        { id: '2', name: 'B', relation: '子女', status: '死亡', deathDate: '2023-01-01' },
        { id: '3', name: 'C', relation: '子女', status: '代位繼承', parentId: '2' },
        { id: '4', name: 'D', relation: '子女', status: '代位繼承', parentId: '2', deathDate: '2023-02-01' },
        { id: '5', name: 'E', relation: '子女', status: '代位繼承', parentId: '4' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, 'A', 1, 2);
      expectShare(results, 'B', 0, 1);
      expectShare(results, 'C', 1, 4);
      expectShare(results, 'D', 0, 1);
      expectShare(results, 'E', 1, 4);
    });
  });

  describe('Multi-level Re-transfer (多層再轉繼承)', () => {
    it('re-transfer with nested re-transfer', () => {
      // No spouse, child A(alive), child B(再轉)
      // B has: B配偶(再轉), B子C(再轉, also dead → re-transfers to C子E)
      // Slots: A + B = 2, each 1/2
      // B(0) → B配偶 + C = 2 → each 1/4
      // C(0) → E gets 1/4
      const persons: Person[] = [
        { id: '1', name: 'A', relation: '子女', status: '一般繼承' },
        { id: '2', name: 'B', relation: '子女', status: '再轉繼承', deathDate: '2024-03-01' },
        { id: '3', name: 'B配偶', relation: '子女之配偶', status: '再轉繼承', parentId: '2' },
        { id: '4', name: 'C', relation: '子女', status: '再轉繼承', parentId: '2', deathDate: '2024-06-01' },
        { id: '5', name: 'E', relation: '子女', status: '再轉繼承', parentId: '4' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, 'A', 1, 2);
      expectShare(results, 'B', 0, 1);
      expectShare(results, 'B配偶', 1, 4);
      expectShare(results, 'C', 0, 1);
      expectShare(results, 'E', 1, 4);
    });
  });

  describe('Divorced Spouse (離婚配偶)', () => {
    it('spouse with divorceDate gets zero share', () => {
      const persons: Person[] = [
        { id: '1', name: '前妻', relation: '配偶', status: '一般繼承', divorceDate: '2020-01-01' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
        { id: '3', name: '次子', relation: '子女', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '前妻', 0, 1);
      expectShare(results, '長子', 1, 2);
      expectShare(results, '次子', 1, 2);
    });

    it('divorced spouse with children: children split equally', () => {
      const persons: Person[] = [
        { id: '1', name: '前妻', relation: '配偶', status: '一般繼承', divorceDate: '2020-01-01' },
        { id: '2', name: '長子', relation: '子女', status: '一般繼承' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '前妻', 0, 1);
      expectShare(results, '長子', 1, 1);
    });

    it('only divorced spouse, no other heirs: all shares zero', () => {
      const persons: Person[] = [
        { id: '1', name: '前妻', relation: '配偶', status: '一般繼承', divorceDate: '2020-01-01' },
      ];
      const results = calculateShares(decedent, persons);
      expectShare(results, '前妻', 0, 1);
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
