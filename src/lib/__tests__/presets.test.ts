import { describe, it, expect } from 'vitest';
import { PRESETS } from '../presets';
import { calculateShares } from '../inheritance';
import { add, ZERO, ONE, equals } from '../fraction';

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
