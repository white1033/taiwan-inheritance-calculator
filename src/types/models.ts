import type { Fraction } from '../lib/fraction.ts';

export type InheritanceStatus =
  | '一般繼承'
  | '死亡'
  | '死亡絕嗣'
  | '拋棄繼承'
  | '代位繼承'
  | '再轉繼承';

export type Relation =
  | '配偶'
  | '子女'
  | '子女之配偶'
  | '父'
  | '母'
  | '兄弟姊妹'
  | '祖父'
  | '祖母'
  | '外祖父'
  | '外祖母';

/** Which inheritance order does this relation belong to? */
export function getOrder(relation: Relation): number | null {
  switch (relation) {
    case '配偶':
      return null; // unconditional heir
    case '子女':
      return 1;
    case '子女之配偶':
      return null;
    case '父':
    case '母':
      return 2;
    case '兄弟姊妹':
      return 3;
    case '祖父':
    case '祖母':
    case '外祖父':
    case '外祖母':
      return 4;
  }
}

export interface Person {
  id: string;
  name: string;
  relation: Relation;
  status: InheritanceStatus;
  birthDate?: string;
  deathDate?: string;
  marriageDate?: string;
  divorceDate?: string;
  parentId?: string;
  inheritanceShare?: Fraction;
  reservedShare?: Fraction;
}

export interface Decedent {
  id: string;
  name: string;
  deathDate?: string;
}

export interface InheritanceCase {
  decedent: Decedent;
  persons: Person[];
}

export const INHERITANCE_STATUS_OPTIONS: InheritanceStatus[] = [
  '一般繼承',
  '死亡',
  '死亡絕嗣',
  '拋棄繼承',
  '代位繼承',
  '再轉繼承',
];

export const RELATION_OPTIONS: Relation[] = [
  '配偶',
  '子女',
  '子女之配偶',
  '父',
  '母',
  '兄弟姊妹',
  '祖父',
  '祖母',
  '外祖父',
  '外祖母',
];
