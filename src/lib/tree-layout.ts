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

export interface TreeLayoutOptions {
  decedent: Decedent;
  persons: Person[];
  results: CalculationResult[];
  selectedId: string | null;
  validationErrors?: ValidationError[];
}

export function buildTreeLayout(
  options: TreeLayoutOptions,
): { nodes: PersonNodeType[]; edges: Edge[] } {
  const {
    decedent,
    persons,
    results,
    selectedId,
    validationErrors = [],
  } = options;
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
        estateAmount: decedent.estateAmount,
        isDecedent: false,
        isSelected: selectedId === person.id,
        hasErrors: personErrorIds.has(person.id),
        hasCurrentSpouse: hasCurrentSpouse(person.id),
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

  // Parents and Grandparents (Above)
  // First, gather all parents and grandparents
  const fatherNode = persons.find((p) => p.relation === '父' && !p.parentId);
  const motherNode = persons.find((p) => p.relation === '母' && !p.parentId);
  const paternalGps = persons.filter(
    (p) => (p.relation === '祖父' || p.relation === '祖母') && !p.parentId,
  );
  const maternalGps = persons.filter(
    (p) => (p.relation === '外祖父' || p.relation === '外祖母') && !p.parentId,
  );

  // Calculate width needed for each parent's branch
  const fatherWidth = Math.max(
    NODE_WIDTH,
    paternalGps.length * NODE_WIDTH + Math.max(0, paternalGps.length - 1) * H_GAP
  );
  const motherWidth = Math.max(
    NODE_WIDTH,
    maternalGps.length * NODE_WIDTH + Math.max(0, maternalGps.length - 1) * H_GAP
  );
  const parentY = -(NODE_HEIGHT + V_GAP);
  const gpY = parentY - NODE_HEIGHT - V_GAP;

  const activeParents = [];
  if (fatherNode) activeParents.push({ node: fatherNode, width: fatherWidth, gps: paternalGps });
  if (motherNode) activeParents.push({ node: motherNode, width: motherWidth, gps: maternalGps });

  if (activeParents.length > 0) {
    const totalParentsWidth =
      activeParents.reduce((sum, p) => sum + p.width, 0) +
      Math.max(0, activeParents.length - 1) * H_GAP;

    let currentX = -totalParentsWidth / 2;

    for (const parentGroup of activeParents) {
      const { node, width, gps } = parentGroup;
      const parentCx = currentX + width / 2;

      // Place parent
      addPersonNode(node, parentCx - NODE_WIDTH / 2, parentY);
      edges.push({
        id: `e-${node.id}-${decedent.id}`,
        source: node.id,
        target: decedent.id,
      });

      // Place grandparents for this parent
      if (gps.length > 0) {
        const gpGroupWidth = gps.length * NODE_WIDTH + Math.max(0, gps.length - 1) * H_GAP;
        const gpStartX = parentCx - gpGroupWidth / 2;
        gps.forEach((gp, i) => {
          const gpX = gpStartX + i * (NODE_WIDTH + H_GAP);
          addPersonNode(gp, gpX - NODE_WIDTH / 2, gpY);
          edges.push({
            id: `e-${gp.id}-${node.id}`,
            source: gp.id,
            target: node.id,
          });
        });
      }

      currentX += width + H_GAP;
    }
  }

  // Fallback: If grandparents exist but their connecting parent doesn't, center them above decedent
  const orphanGps = [];
  if (!fatherNode) orphanGps.push(...paternalGps);
  if (!motherNode) orphanGps.push(...maternalGps);
  if (orphanGps.length > 0) {
    const gpGroupWidth = orphanGps.length * NODE_WIDTH + Math.max(0, orphanGps.length - 1) * H_GAP;
    let currentX = -gpGroupWidth / 2;
    orphanGps.forEach((gp) => {
      addPersonNode(gp, currentX, gpY);
      edges.push({
        id: `e-${gp.id}-${decedent.id}`,
        source: gp.id,
        target: decedent.id,
      });
      currentX += NODE_WIDTH + H_GAP;
    });
  }

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


  return { nodes, edges };
}
