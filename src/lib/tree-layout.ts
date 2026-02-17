import type React from 'react';
import type { Edge } from '@xyflow/react';
import type { Person, Decedent } from '../types/models.ts';
import type { CalculationResult } from './inheritance.ts';
import type { ValidationError } from './validation.ts';
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
  validationErrors: ValidationError[] = [],
  onContextMenu?: (id: string, isDecedent: boolean, event: React.MouseEvent) => void,
  onAddChild?: (id: string) => void,
  onAddSpouse?: (id: string) => void,
): { nodes: PersonNodeType[]; edges: Edge[] } {
  const nodes: PersonNodeType[] = [];
  const edges: Edge[] = [];

  const resultMap = new Map(results.map((r) => [r.id, r]));
  const personErrorIds = new Set(validationErrors.map((e) => e.personId));

  function hasCurrentSpouse(personId: string): boolean {
    return persons.some(
      (p) => p.parentId === personId && p.relation === '子女之配偶' && !p.divorceDate,
    );
  }

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
        hasErrors: personErrorIds.has(person.id),
        hasCurrentSpouse: hasCurrentSpouse(person.id),
        onSelect,
        onDelete,
        onContextMenu,
        onAddChild,
        onAddSpouse,
      } satisfies PersonNodeData,
    });
  }

  function hasSpouseNode(personId: string): boolean {
    return persons.some(
      (p) => p.parentId === personId && p.relation === '子女之配偶',
    );
  }

  /** Calculate the width needed by a person and all their descendants */
  function subtreeWidth(personId: string): number {
    const childPersons = persons.filter(
      (p) => p.parentId === personId && p.relation !== '子女之配偶',
    );
    const selfWidth = hasSpouseNode(personId) ? NODE_WIDTH * 2 + H_GAP : NODE_WIDTH;
    if (childPersons.length === 0) return selfWidth;
    const childrenWidth = childPersons.reduce(
      (sum, c) => sum + subtreeWidth(c.id),
      0,
    );
    return Math.max(
      selfWidth,
      childrenWidth + (childPersons.length - 1) * H_GAP,
    );
  }

  /** Recursively layout a person's sub-heirs */
  function layoutSubtree(personId: string, cx: number, y: number) {
    // Find spouse of this person (子女之配偶 with matching parentId)
    const personSpouse = persons.find(
      (p) => p.parentId === personId && p.relation === '子女之配偶',
    );
    // When a spouse exists, the person is shifted right from subtree center
    const offset = personSpouse ? (NODE_WIDTH + H_GAP) / 2 : 0;
    const personCx = cx + offset;

    if (personSpouse) {
      addPersonNode(personSpouse, personCx - NODE_WIDTH / 2 - H_GAP - NODE_WIDTH, y);
      edges.push({
        id: `e-${personId}-${personSpouse.id}`,
        source: personId,
        target: personSpouse.id,
        type: 'straight',
        style: { strokeDasharray: '5,5' },
      });
    }

    // Find children of this person (exclude spouses)
    const childPersons = persons.filter(
      (p) => p.parentId === personId && p.relation !== '子女之配偶',
    );
    if (childPersons.length === 0) return;

    const childY = y + NODE_HEIGHT + V_GAP;
    const totalWidth =
      childPersons.reduce((sum, c) => sum + subtreeWidth(c.id), 0) +
      (childPersons.length - 1) * H_GAP;
    let currentX = cx - totalWidth / 2;

    for (const child of childPersons) {
      const w = subtreeWidth(child.id);
      const childCx = currentX + w / 2;
      const childOffset = hasSpouseNode(child.id) ? (NODE_WIDTH + H_GAP) / 2 : 0;
      addPersonNode(child, childCx + childOffset - NODE_WIDTH / 2, childY);
      edges.push({
        id: `e-${personId}-${child.id}`,
        source: personId,
        target: child.id,
        style:
          child.status === '代位繼承'
            ? { strokeDasharray: '5,5' }
            : child.status === '再轉繼承'
              ? { strokeDasharray: '3,3' }
              : undefined,
      });
      // Recurse
      layoutSubtree(child.id, childCx, childY);
      currentX += w + H_GAP;
    }
  }

  // --- Top-level layout ---

  // Decedent at center
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
      onContextMenu,
      onAddChild,
      onAddSpouse,
    } satisfies PersonNodeData,
  });

  // Spouse of decedent (direct, no parentId)
  const spouse = persons.find((p) => p.relation === '配偶' && !p.parentId);
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

  // Parents above (no parentId)
  const parentPersons = persons.filter(
    (p) => (p.relation === '父' || p.relation === '母') && !p.parentId,
  );
  const parentY = -(NODE_HEIGHT + V_GAP);
  const parentStartX = -((parentPersons.length - 1) * (NODE_WIDTH + H_GAP)) / 2;
  parentPersons.forEach((p, i) => {
    const x = parentStartX + i * (NODE_WIDTH + H_GAP);
    addPersonNode(p, x, parentY);
    edges.push({
      id: `e-${p.id}-${decedent.id}`,
      source: p.id,
      target: decedent.id,
    });
  });

  // Children below (direct children: relation=子女, no parentId)
  const directChildren = persons.filter(
    (p) => p.relation === '子女' && !p.parentId,
  );
  const childY = NODE_HEIGHT + V_GAP;
  const totalChildWidth =
    directChildren.reduce((sum, c) => sum + subtreeWidth(c.id), 0) +
    Math.max(0, directChildren.length - 1) * H_GAP;
  let childX = -totalChildWidth / 2;

  for (const child of directChildren) {
    const w = subtreeWidth(child.id);
    const cx = childX + w / 2;
    const offset = hasSpouseNode(child.id) ? (NODE_WIDTH + H_GAP) / 2 : 0;
    addPersonNode(child, cx + offset - NODE_WIDTH / 2, childY);
    edges.push({
      id: `e-${decedent.id}-${child.id}`,
      source: decedent.id,
      target: child.id,
    });
    // Recurse into sub-tree
    layoutSubtree(child.id, cx, childY);
    childX += w + H_GAP;
  }

  // Siblings to the right (no parentId)
  const siblingPersons = persons.filter(
    (p) => p.relation === '兄弟姊妹' && !p.parentId,
  );
  siblingPersons.forEach((sib, i) => {
    const x = NODE_WIDTH + H_GAP * 2 + (spouse ? NODE_WIDTH + H_GAP : 0);
    const y = i * (NODE_HEIGHT + V_GAP / 2);
    addPersonNode(sib, x, y);
    edges.push({
      id: `e-${decedent.id}-${sib.id}`,
      source: decedent.id,
      target: sib.id,
    });
  });

  // Grandparents above parents (no parentId)
  const gpPersons = persons.filter((p) =>
    (['祖父', '祖母', '外祖父', '外祖母'] as string[]).includes(p.relation) && !p.parentId,
  );
  const gpY = parentY - NODE_HEIGHT - V_GAP;
  const gpStartX = -((gpPersons.length - 1) * (NODE_WIDTH + H_GAP)) / 2;
  gpPersons.forEach((gp, i) => {
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
