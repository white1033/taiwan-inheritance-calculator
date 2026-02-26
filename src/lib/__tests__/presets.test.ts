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
