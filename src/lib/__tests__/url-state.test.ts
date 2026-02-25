import { describe, it, expect } from 'vitest';
import { encodeState, decodeState } from '../url-state';
import type { Person, Decedent } from '../../types/models';

describe('url-state', () => {
  const decedent: Decedent = {
    id: 'd1',
    name: '王大明',
    deathDate: '2024-01-15',
    estateAmount: 10000000,
  };

  const persons: Person[] = [
    { id: 'p1', name: '李小華', relation: '配偶', status: '一般繼承', birthDate: '1965-09-12', marriageDate: '1990-11-03' },
    { id: 'p2', name: '王一郎', relation: '子女', status: '一般繼承', birthDate: '1992-03-18' },
    { id: 'p3', name: '王二郎', relation: '子女', status: '死亡', deathDate: '2023-06-01' },
    { id: 'p4', name: '王孫A', relation: '子女', status: '代位繼承', parentId: 'p3' },
  ];

  it('encode → decode round-trip preserves data', async () => {
    const encoded = await encodeState(decedent, persons);
    expect(encoded).toBeTruthy();
    expect(encoded.startsWith('2')).toBe(true);

    const decoded = await decodeState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.decedent.name).toBe('王大明');
    expect(decoded!.decedent.deathDate).toBe('2024-01-15');
    expect(decoded!.decedent.estateAmount).toBe(10000000);
    expect(decoded!.persons).toHaveLength(4);

    expect(decoded!.persons[0].name).toBe('李小華');
    expect(decoded!.persons[0].relation).toBe('配偶');
    expect(decoded!.persons[0].status).toBe('一般繼承');
    expect(decoded!.persons[0].birthDate).toBe('1965-09-12');
    expect(decoded!.persons[0].marriageDate).toBe('1990-11-03');

    expect(decoded!.persons[2].status).toBe('死亡');
    expect(decoded!.persons[2].deathDate).toBe('2023-06-01');

    // parentId should be resolved (p4 → index of p3)
    expect(decoded!.persons[3].parentId).toBe(decoded!.persons[2].id);
  });

  it('empty persons round-trip', async () => {
    const minDecedent: Decedent = { id: 'd', name: '測試' };
    const encoded = await encodeState(minDecedent, []);
    const decoded = await decodeState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.decedent.name).toBe('測試');
    expect(decoded!.persons).toHaveLength(0);
  });

  it('returns null for empty hash', async () => {
    expect(await decodeState('')).toBeNull();
  });

  it('v2 prefix is detected correctly', async () => {
    const encoded = await encodeState(decedent, persons);
    expect(encoded.startsWith('2')).toBe(true);
  });

  it('preserves divorceDate in round-trip', async () => {
    const personsWithDivorce: Person[] = [
      { id: 'p1', name: '前妻', relation: '配偶', status: '一般繼承', divorceDate: '2020-05-15' },
    ];
    const encoded = await encodeState(decedent, personsWithDivorce);
    const decoded = await decodeState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.persons[0].divorceDate).toBe('2020-05-15');
  });
});
