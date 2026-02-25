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
  const rn = n / g;
  const rd = d / g;
  if (!Number.isSafeInteger(rn) || !Number.isSafeInteger(rd)) {
    throw new Error(
      `Fraction overflow: ${rn}/${rd} exceeds safe integer range. ` +
      `Consider reducing the complexity of the inheritance tree.`
    );
  }
  return { n: rn, d: rd };
}

export function frac(n: number, d: number = 1): Fraction {
  return simplify(n, d);
}

export function add(a: Fraction, b: Fraction): Fraction {
  // Cross-multiply with pre-reduction to minimize overflow risk
  const g = gcd(a.d, b.d);
  const da = a.d / g;
  const db = b.d / g;
  return simplify(a.n * db + b.n * da, da * b.d);
}

export function subtract(a: Fraction, b: Fraction): Fraction {
  const g = gcd(a.d, b.d);
  const da = a.d / g;
  const db = b.d / g;
  return simplify(a.n * db - b.n * da, da * b.d);
}

export function multiply(a: Fraction, b: Fraction): Fraction {
  // Cross-reduce before multiplying to minimize overflow risk
  const g1 = gcd(Math.abs(a.n), b.d);
  const g2 = gcd(Math.abs(b.n), a.d);
  return simplify((a.n / g1) * (b.n / g2), (a.d / g2) * (b.d / g1));
}

export function divide(a: Fraction, b: Fraction): Fraction {
  if (b.n === 0) throw new Error('Division by zero');
  // Cross-reduce before multiplying to minimize overflow risk
  const g1 = gcd(Math.abs(a.n), Math.abs(b.n));
  const g2 = gcd(a.d, b.d);
  return simplify((a.n / g1) * (b.d / g2), (a.d / g2) * (b.n / g1));
}

export function equals(a: Fraction, b: Fraction): boolean {
  // Compare via reduced forms to avoid cross-multiplication overflow
  // (a.n * b.d can exceed Number.MAX_SAFE_INTEGER for deep inheritance trees)
  const sa = simplify(a.n, a.d);
  const sb = simplify(b.n, b.d);
  return sa.n === sb.n && sa.d === sb.d;
}

export function toString(f: Fraction): string {
  if (f.n === 0) return '0';
  if (f.d === 1) return `${f.n}`;
  return `${f.n}/${f.d}`;
}

export function toPercent(f: Fraction): string {
  if (f.n === 0) return '0%';
  const pct = (f.n / f.d) * 100;
  // Use up to 1 decimal place, drop trailing .0
  const formatted = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1);
  return `${formatted}%`;
}

export const ZERO = frac(0);
export const ONE = frac(1);
