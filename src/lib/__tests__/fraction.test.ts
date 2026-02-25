import { describe, it, expect } from 'vitest';
import { frac, add, subtract, multiply, divide, equals, toString } from '../fraction';

describe('Fraction', () => {
  describe('frac (constructor)', () => {
    it('creates a fraction', () => {
      expect(frac(1, 3)).toEqual({ n: 1, d: 3 });
    });
    it('auto-simplifies', () => {
      expect(frac(2, 6)).toEqual({ n: 1, d: 3 });
    });
    it('handles zero numerator', () => {
      expect(frac(0, 5)).toEqual({ n: 0, d: 1 });
    });
    it('throws on zero denominator', () => {
      expect(() => frac(1, 0)).toThrow();
    });
    it('normalizes negative denominator', () => {
      expect(frac(1, -3)).toEqual({ n: -1, d: 3 });
    });
  });

  describe('add', () => {
    it('adds fractions with same denominator', () => {
      expect(add(frac(1, 3), frac(1, 3))).toEqual(frac(2, 3));
    });
    it('adds fractions with different denominators', () => {
      expect(add(frac(1, 2), frac(1, 3))).toEqual(frac(5, 6));
    });
    it('simplifies result', () => {
      expect(add(frac(1, 4), frac(1, 4))).toEqual(frac(1, 2));
    });
  });

  describe('subtract', () => {
    it('subtracts fractions', () => {
      expect(subtract(frac(1, 2), frac(1, 3))).toEqual(frac(1, 6));
    });
    it('returns zero when equal', () => {
      expect(subtract(frac(1, 3), frac(1, 3))).toEqual(frac(0, 1));
    });
  });

  describe('multiply', () => {
    it('multiplies fractions', () => {
      expect(multiply(frac(1, 2), frac(1, 3))).toEqual(frac(1, 6));
    });
    it('multiplies and simplifies', () => {
      expect(multiply(frac(2, 3), frac(3, 4))).toEqual(frac(1, 2));
    });
  });

  describe('divide', () => {
    it('divides fractions', () => {
      expect(divide(frac(1, 2), frac(1, 3))).toEqual(frac(3, 2));
    });
    it('throws on division by zero', () => {
      expect(() => divide(frac(1, 2), frac(0, 1))).toThrow();
    });
  });

  describe('equals', () => {
    it('returns true for equal fractions', () => {
      expect(equals(frac(1, 3), frac(2, 6))).toBe(true);
    });
    it('returns false for unequal fractions', () => {
      expect(equals(frac(1, 3), frac(1, 4))).toBe(false);
    });
  });

  describe('toString', () => {
    it('formats as fraction string', () => {
      expect(toString(frac(1, 3))).toBe('1/3');
    });
    it('formats whole number without denominator', () => {
      expect(toString(frac(3, 1))).toBe('3');
    });
    it('formats zero', () => {
      expect(toString(frac(0, 1))).toBe('0');
    });
  });

  describe('overflow protection', () => {
    it('throws when result exceeds safe integer range', () => {
      // 2^53 is beyond MAX_SAFE_INTEGER after GCD reduction
      expect(() => frac(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1)).not.toThrow();
      // Direct construction with unsafe values
      expect(() => frac(1, Number.MAX_SAFE_INTEGER + 1)).toThrow(/overflow/i);
    });

    it('handles large but reducible fractions safely', () => {
      // 1000000 / 2000000 reduces to 1/2, should be fine
      expect(frac(1000000, 2000000)).toEqual({ n: 1, d: 2 });
    });

    it('pre-reduces operations to avoid intermediate overflow', () => {
      // multiply(1/large, large/1) should reduce cross-terms first
      const large = 999999999;
      expect(multiply(frac(1, large), frac(large, 1))).toEqual(frac(1, 1));
    });
  });
});
