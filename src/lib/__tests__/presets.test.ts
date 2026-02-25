import { describe, it, expect } from 'vitest';
import { PRESETS } from '../presets';
import { calculateShares } from '../inheritance';

describe('Preset correctness', () => {
  for (const preset of PRESETS) {
    it(`preset "${preset.label}" calculates without invariant violation`, () => {
      expect(() => calculateShares(preset.decedent, preset.persons)).not.toThrow();
    });
  }
});
