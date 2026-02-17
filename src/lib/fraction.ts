export interface Fraction {
  readonly n: number; // numerator
  readonly d: number; // denominator (always positive)
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function simplify(n: number, d: number): Fraction {
  if (d === 0) throw new Error('Denominator cannot be zero');
  if (n === 0) return { n: 0, d: 1 };
  const sign = d < 0 ? -1 : 1;
  n = n * sign;
  d = d * sign;
  const g = gcd(Math.abs(n), d);
  return { n: n / g, d: d / g };
}

export function frac(n: number, d: number = 1): Fraction {
  return simplify(n, d);
}

export function add(a: Fraction, b: Fraction): Fraction {
  return simplify(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function subtract(a: Fraction, b: Fraction): Fraction {
  return simplify(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function multiply(a: Fraction, b: Fraction): Fraction {
  return simplify(a.n * b.n, a.d * b.d);
}

export function divide(a: Fraction, b: Fraction): Fraction {
  if (b.n === 0) throw new Error('Division by zero');
  return simplify(a.n * b.d, a.d * b.n);
}

export function equals(a: Fraction, b: Fraction): boolean {
  return a.n * b.d === b.n * a.d;
}

export function toString(f: Fraction): string {
  if (f.n === 0) return '0';
  if (f.d === 1) return `${f.n}`;
  return `${f.n}/${f.d}`;
}

export const ZERO = frac(0);
export const ONE = frac(1);
