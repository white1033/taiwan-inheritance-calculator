import type { Edge } from '@xyflow/react';
import type { Person, Decedent } from '../types/models.ts';
import type { CalculationResult } from './inheritance.ts';
import { ZERO } from './fraction.ts';
import type { PersonNodeData, PersonNodeType } from '../components/PersonNode.tsx';

const NODE_WIDTH = 208;
const NODE_HEIGHT = 200;
const H_GAP = 40;
const V_GAP = 80;

export function buildTreeLayout(
  decedent: Decedent,
  persons: Person[],
  results: CalculationResult[],
  selectedId: string | null,
  onSelect: (id: string) => void,
  onDelete: (id: string) => void,
): { nodes: PersonNodeType[]; edges: Edge[] } {
  const nodes: PersonNodeType[] = [];
  const edges: Edge[] = [];

  const resultMap = new Map(results.map((r) => [r.id, r]));

  // Decedent node at center top
  nodes.push({
    id: decedent.id,
    type: 'person',
    position: { x: 0, y: 0 },
    data: {
      name: decedent.name || '(未命名)',
      relation: '配偶',
      status: '死亡',
      deathDate: decedent.deathDate,
      isDecedent: true,
      isSelected: false,
      onSelect,
      onDelete,
    } satisfies PersonNodeData,
  });

  const spouse = persons.find((p) => p.relation === '配偶');
  const children = persons.filter(
    (p) =>
      p.relation === '子女' &&
      p.status !== '代位繼承' &&
      p.status !== '再轉繼承',
  );
  const parents = persons.filter(
    (p) => p.relation === '父' || p.relation === '母',
  );
  const siblings = persons.filter((p) => p.relation === '兄弟姊妹');
  const grandparents = persons.filter((p) =>
    (['祖父', '祖母', '外祖父', '外祖母'] as string[]).includes(p.relation),
  );
  const subHeirs = persons.filter(
    (p) =>
      p.status === '代位繼承' || (p.status === '再轉繼承' && p.parentId),
  );

  function addPersonNode(person: Person, x: number, y: number) {
    const result = resultMap.get(person.id);
    nodes.push({
      id: person.id,
      type: 'person',
      position: { x, y },
      data: {
        name: person.name,
        relation: person.relation,
        status: person.status,
        birthDate: person.birthDate,
        deathDate: person.deathDate,
        marriageDate: person.marriageDate,
        divorceDate: person.divorceDate,
        inheritanceShare: result?.inheritanceShare ?? ZERO,
        reservedShare: result?.reservedShare ?? ZERO,
        isDecedent: false,
        isSelected: selectedId === person.id,
        onSelect,
        onDelete,
      } satisfies PersonNodeData,
    });
  }

  // Spouse to the left
  if (spouse) {
    addPersonNode(spouse, -(NODE_WIDTH + H_GAP), 0);
    edges.push({
      id: `e-${decedent.id}-${spouse.id}`,
      source: decedent.id,
      target: spouse.id,
      type: 'straight',
      style: { strokeDasharray: '5,5' },
    });
  }

  // Parents above
  const parentY = -(NODE_HEIGHT + V_GAP);
  const parentStartX =
    -((parents.length - 1) * (NODE_WIDTH + H_GAP)) / 2;
  parents.forEach((p, i) => {
    const x = parentStartX + i * (NODE_WIDTH + H_GAP);
    addPersonNode(p, x, parentY);
    edges.push({
      id: `e-${p.id}-${decedent.id}`,
      source: p.id,
      target: decedent.id,
    });
  });

  // Children below
  const childY = NODE_HEIGHT + V_GAP;
  const childStartX =
    -((children.length - 1) * (NODE_WIDTH + H_GAP)) / 2;
  children.forEach((child, i) => {
    const x = childStartX + i * (NODE_WIDTH + H_GAP);
    addPersonNode(child, x, childY);
    edges.push({
      id: `e-${decedent.id}-${child.id}`,
      source: decedent.id,
      target: child.id,
    });

    const childSubHeirs = subHeirs.filter((s) => s.parentId === child.id);
    const subY = childY + NODE_HEIGHT + V_GAP;
    const subStartX =
      x - ((childSubHeirs.length - 1) * (NODE_WIDTH + H_GAP)) / 2;
    childSubHeirs.forEach((sub, j) => {
      const sx = subStartX + j * (NODE_WIDTH + H_GAP);
      addPersonNode(sub, sx, subY);
      edges.push({
        id: `e-${child.id}-${sub.id}`,
        source: child.id,
        target: sub.id,
        style:
          sub.status === '代位繼承'
            ? { strokeDasharray: '5,5' }
            : undefined,
      });
    });
  });

  // Siblings to the right
  siblings.forEach((sib, i) => {
    const x =
      NODE_WIDTH +
      H_GAP * 2 +
      (spouse ? NODE_WIDTH + H_GAP : 0);
    const y = i * (NODE_HEIGHT + V_GAP / 2);
    addPersonNode(sib, x, y);
    edges.push({
      id: `e-${decedent.id}-${sib.id}`,
      source: decedent.id,
      target: sib.id,
    });
  });

  // Grandparents above parents
  const gpY = parentY - NODE_HEIGHT - V_GAP;
  const gpStartX =
    -((grandparents.length - 1) * (NODE_WIDTH + H_GAP)) / 2;
  grandparents.forEach((gp, i) => {
    const x = gpStartX + i * (NODE_WIDTH + H_GAP);
    addPersonNode(gp, x, gpY);
    edges.push({
      id: `e-${gp.id}-${decedent.id}`,
      source: gp.id,
      target: decedent.id,
    });
  });

  return { nodes, edges };
}
