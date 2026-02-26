import { describe, it, expect } from 'vitest';
import { PRESETS } from '../presets';
import { calculateShares } from '../inheritance';
import { add, ZERO, ONE, equals, toString } from '../fraction';
import { frac } from '../fraction';

describe('Preset correctness', () => {
  for (const preset of PRESETS) {
    it(`preset "${preset.label}" calculates without invariant violation`, () => {
      expect(() => calculateShares(preset.decedent, preset.persons)).not.toThrow();
    });

    it(`preset "${preset.label}" shares sum to 1 when active heirs exist`, () => {
      const results = calculateShares(preset.decedent, preset.persons);
      const hasActive = results.some(r => r.inheritanceShare.n > 0);
      if (hasActive) {
        const total = results.reduce((sum, r) => add(sum, r.inheritanceShare), ZERO);
        expect(equals(total, ONE)).toBe(true);
      }
    });
  }
});

describe('Multiple spouses preset (多重配偶)', () => {
  const preset = PRESETS.find(p => p.label.includes('多重配偶'));

  it('preset exists', () => {
    expect(preset).toBeDefined();
  });

  it('former spouses get zero share', () => {
    const results = calculateShares(preset!.decedent, preset!.persons);
    const exWife1 = results.find(r => r.name === '林淑惠');
    const exWife2 = results.find(r => r.name === '陳雅芳');
    expect(exWife1).toBeDefined();
    expect(exWife2).toBeDefined();
    expect(equals(exWife1!.inheritanceShare, ZERO)).toBe(true);
    expect(equals(exWife2!.inheritanceShare, ZERO)).toBe(true);
  });

  it('current spouse and all children each get 1/5', () => {
    const results = calculateShares(preset!.decedent, preset!.persons);
    // 現任配偶 + 4名子女 = 5人均分
    const currentWife = results.find(r => r.name === '張曉萍');
    expect(currentWife).toBeDefined();
    expect(
      equals(currentWife!.inheritanceShare, frac(1, 5)),
      `Expected 張曉萍 share = 1/5, got ${toString(currentWife!.inheritanceShare)}`
    ).toBe(true);

    for (const childName of ['黃志豪', '黃美玲', '黃俊傑', '黃小安']) {
      const child = results.find(r => r.name === childName);
      expect(child, `${childName} not found`).toBeDefined();
      expect(
        equals(child!.inheritanceShare, frac(1, 5)),
        `Expected ${childName} share = 1/5, got ${toString(child!.inheritanceShare)}`
      ).toBe(true);
    }
  });
});

describe('Spouse only preset (僅配偶)', () => {
  const preset = PRESETS.find(p => p.label.includes('僅配偶'));

  it('preset exists', () => {
    expect(preset).toBeDefined();
  });

  it('spouse gets 100%', () => {
    const results = calculateShares(preset!.decedent, preset!.persons);
    const spouse = results.find(r => r.name === '孫麗華');
    expect(spouse).toBeDefined();
    expect(equals(spouse!.inheritanceShare, ONE)).toBe(true);
  });
});

describe('Children only preset (無配偶僅子女)', () => {
  const preset = PRESETS.find(p => p.label.includes('無配偶'));

  it('preset exists', () => {
    expect(preset).toBeDefined();
  });

  it('each child gets 1/3', () => {
    const results = calculateShares(preset!.decedent, preset!.persons);
    for (const name of ['鄭家豪', '鄭家瑋', '鄭美玲']) {
      const child = results.find(r => r.name === name);
      expect(child, `${name} not found`).toBeDefined();
      expect(
        equals(child!.inheritanceShare, frac(1, 3)),
        `Expected ${name} share = 1/3, got ${toString(child!.inheritanceShare)}`
      ).toBe(true);
    }
  });
});

describe('Partial renunciation preset (部分拋棄)', () => {
  const preset = PRESETS.find(p => p.label.includes('部分拋棄'));

  it('preset exists', () => {
    expect(preset).toBeDefined();
  });

  it('renounced child gets zero, others split equally', () => {
    const results = calculateShares(preset!.decedent, preset!.persons);
    const renounced = results.find(r => r.name === '何美華');
    expect(renounced).toBeDefined();
    expect(equals(renounced!.inheritanceShare, ZERO)).toBe(true);

    // 配偶 + 2 remaining children = 3 people, each 1/3
    for (const name of ['方淑芬', '何志明', '何小安']) {
      const person = results.find(r => r.name === name);
      expect(person, `${name} not found`).toBeDefined();
      expect(
        equals(person!.inheritanceShare, frac(1, 3)),
        `Expected ${name} share = 1/3, got ${toString(person!.inheritanceShare)}`
      ).toBe(true);
    }
  });
});

describe('Extinct heir preset (死亡絕嗣)', () => {
  const preset = PRESETS.find(p => p.label.includes('死亡絕嗣'));

  it('preset exists', () => {
    expect(preset).toBeDefined();
  });

  it('extinct heir gets zero, spouse and surviving child split equally', () => {
    const results = calculateShares(preset!.decedent, preset!.persons);
    const extinct = results.find(r => r.name === '曾小芳');
    expect(extinct).toBeDefined();
    expect(equals(extinct!.inheritanceShare, ZERO)).toBe(true);

    // 配偶 + 1 surviving child = 2 people, each 1/2
    for (const name of ['蕭雅琪', '曾大偉']) {
      const person = results.find(r => r.name === name);
      expect(person, `${name} not found`).toBeDefined();
      expect(
        equals(person!.inheritanceShare, frac(1, 2)),
        `Expected ${name} share = 1/2, got ${toString(person!.inheritanceShare)}`
      ).toBe(true);
    }
  });
});

describe('Spouse + single parent preset (配偶+僅單親)', () => {
  const preset = PRESETS.find(p => p.label.includes('僅單親'));

  it('preset exists', () => {
    expect(preset).toBeDefined();
  });

  it('spouse gets 1/2, mother gets 1/2', () => {
    const results = calculateShares(preset!.decedent, preset!.persons);
    const spouse = results.find(r => r.name === '葉佳玲');
    const mother = results.find(r => r.name === '周秀蓮');
    expect(spouse).toBeDefined();
    expect(mother).toBeDefined();
    expect(
      equals(spouse!.inheritanceShare, frac(1, 2)),
      `Expected 葉佳玲 share = 1/2, got ${toString(spouse!.inheritanceShare)}`
    ).toBe(true);
    expect(
      equals(mother!.inheritanceShare, frac(1, 2)),
      `Expected 周秀蓮 share = 1/2, got ${toString(mother!.inheritanceShare)}`
    ).toBe(true);
  });
});
