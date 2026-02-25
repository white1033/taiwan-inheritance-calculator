import { describe, test, expect } from 'vitest';
import { buildTreeLayout } from '../tree-layout';
import type { Person, Decedent } from '../../types/models';
import type { CalculationResult } from '../inheritance';
import type { ValidationError } from '../validation';
import type { Edge } from '@xyflow/react';
import type { PersonNodeType } from '../../components/PersonNode';

function makeDecedent(): Decedent {
  return { id: 'D', name: '被繼承人', deathDate: '2024-01-01' };
}

function makePerson(
  id: string,
  relation: Person['relation'],
  status: Person['status'] = '一般繼承',
  parentId?: string
): Person {
  return { id, name: id, relation, status, parentId };
}

function layout(
  persons: Person[],
  results: CalculationResult[] = [],
  selectedId: string | null = null,
  validationErrors: ValidationError[] = [],
) {
  return buildTreeLayout({
    decedent: makeDecedent(),
    persons,
    results,
    selectedId,
    validationErrors,
  });
}

function findNode(result: { nodes: PersonNodeType[]; edges: Edge[] }, id: string) {
  return result.nodes.find(n => n.id === id);
}

function findEdge(result: { nodes: PersonNodeType[]; edges: Edge[] }, source: string, target: string) {
  return result.edges.find(e => e.source === source && e.target === target);
}

describe('tree-layout', () => {
  test('Empty: no persons -> only decedent node at (0,0)', () => {
    const { nodes, edges } = layout([]);
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
    
    const d = findNode({ nodes, edges }, 'D');
    expect(d).toBeDefined();
    // DECEDENT_NODE_WIDTH=240, offset = -(240-208)/2 = -16
    expect(d?.position).toEqual({ x: -16, y: 0 });
    expect(d?.data.isDecedent).toBe(true);
    expect(d?.data.name).toBe('被繼承人');
  });

  test('Spouse only: edge between them, spouse at -(208+40)', () => {
    const { nodes, edges } = layout([makePerson('S', '配偶')]);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);

    const s = findNode({ nodes, edges }, 'S');
    expect(s?.position).toEqual({ x: -248, y: 0 });
    
    const edge = findEdge({ nodes, edges }, 'D', 'S');
    expect(edge).toBeDefined();
    // Spouse edge: horizontal with left/right handles
    expect(edge?.sourceHandle).toBe('left');
    expect(edge?.targetHandle).toBe('right');
    expect(edge?.style?.stroke).toBe('#94a3b8');
    expect(edge?.style?.strokeWidth).toBe(2);
  });

  test('Parents: 父+母 -> both above decedent, centered', () => {
    const { nodes, edges } = layout([makePerson('F', '父'), makePerson('M', '母')]);
    expect(nodes).toHaveLength(3); // D, F, M
    expect(edges).toHaveLength(2);

    const f = findNode({ nodes, edges }, 'F');
    const m = findNode({ nodes, edges }, 'M');
    
    // y = -(200 + 160) = -360
    expect(f?.position.y).toBe(-360);
    expect(m?.position.y).toBe(-360);
    
    // Centered: F at -124, M at 124 (adjusted for NODE_WIDTH/2 = 104 in layout logic)
    // Actually, x is placed at parentCx - NODE_WIDTH/2
    // totalParentsWidth = 2 * 208 + 40 = 456
    // parentCx for F = -228 + 104 = -124, so x = -124 - 104 = -228
    expect(f?.position.x).toBe(-228);
    // parentCx for M = -228 + 208 + 40 + 104 = 124, so x = 124 - 104 = 20
    expect(m?.position.x).toBe(20);

    expect(findEdge({ nodes, edges }, 'F', 'D')).toBeDefined();
    expect(findEdge({ nodes, edges }, 'M', 'D')).toBeDefined();
  });

  test('Single parent: just 父 -> above decedent, centered at 0', () => {
    const { nodes } = layout([makePerson('F', '父')]);
    const f = findNode({ nodes, edges: [] }, 'F');
    // totalWidth = 208, cx = 0, x = -104
    expect(f?.position.x).toBe(-104);
    expect(f?.position.y).toBe(-360);
  });

  test('Children: 2 子女 -> below decedent, evenly spread', () => {
    const { nodes, edges } = layout([makePerson('C1', '子女'), makePerson('C2', '子女')]);
    const c1 = findNode({ nodes, edges }, 'C1');
    const c2 = findNode({ nodes, edges }, 'C2');

    // y = 200 + 160 = 360
    expect(c1?.position.y).toBe(360);
    expect(c2?.position.y).toBe(360);

    expect(c1?.position.x).toBe(-228); // -124 - 104
    expect(c2?.position.x).toBe(20);   // 124 - 104
    
    expect(findEdge({ nodes, edges }, 'D', 'C1')).toBeDefined();
    expect(findEdge({ nodes, edges }, 'D', 'C2')).toBeDefined();
  });

  test('Single child -> centered below decedent', () => {
    const { nodes } = layout([makePerson('C1', '子女')]);
    const c1 = findNode({ nodes, edges: [] }, 'C1');
    expect(c1?.position.x).toBe(-104);
    expect(c1?.position.y).toBe(360);
  });

  test('Siblings: to the right of decedent, horizontal layout', () => {
    const { nodes, edges } = layout([makePerson('B1', '兄弟姊妹'), makePerson('B2', '兄弟姊妹')]);
    const b1 = findNode({ nodes, edges }, 'B1');
    const b2 = findNode({ nodes, edges }, 'B2');

    // siblingStartX = NODE_WIDTH + H_GAP * 2 = 208 + 80 = 288
    // b1.x = 288 + 0 * (208+40) = 288
    expect(b1?.position.x).toBe(288);
    // b2.x = 288 + 1 * (208+40) = 536
    expect(b2?.position.x).toBe(536);

    // All siblings on same y = 0
    expect(b1?.position.y).toBe(0);
    expect(b2?.position.y).toBe(0);
  });

  test('Grandparents: 祖父+祖母 connect to 父, 外祖父+外祖母 connect to 母', () => {
    const persons = [
      makePerson('F', '父'), makePerson('M', '母'),
      makePerson('GF1', '祖父'), makePerson('GM1', '祖母'),
      makePerson('GF2', '外祖父'), makePerson('GM2', '外祖母')
    ];
    const { nodes, edges } = layout(persons);
    
    // y = -360 - 200 - 160 = -720
    const gf1 = findNode({ nodes, edges }, 'GF1');
    expect(gf1?.position.y).toBe(-720);
    
    // Check connections
    expect(findEdge({ nodes, edges }, 'GF1', 'F')).toBeDefined();
    expect(findEdge({ nodes, edges }, 'GM1', 'F')).toBeDefined();
    expect(findEdge({ nodes, edges }, 'GF2', 'M')).toBeDefined();
    expect(findEdge({ nodes, edges }, 'GM2', 'M')).toBeDefined();
  });

  test('Grandparents without parents fallback to connecting to decedent', () => {
    const { nodes, edges } = layout([makePerson('GF1', '祖父')]);
    expect(findEdge({ nodes, edges }, 'GF1', 'D')).toBeDefined();
  });

  test('Representation sub-tree: child with 代位繼承 sub-heirs', () => {
    const persons = [
      makePerson('C', '子女', '死亡'),
      makePerson('GC1', '子女', '代位繼承', 'C'),
      makePerson('GC2', '子女', '代位繼承', 'C')
    ];
    const { nodes, edges } = layout(persons);
    
    const gc1 = findNode({ nodes, edges }, 'GC1');
    const gc2 = findNode({ nodes, edges }, 'GC2');
    
    // nested y = childY + 200 + 160 = 720
    expect(gc2?.position.y).toBe(720);
    expect(gc1?.position.y).toBe(720);
    
    // connection from C to GC1
    expect(findEdge({ nodes, edges }, 'C', 'GC1')).toBeDefined();
  });

  test('Child with spouse (子女之配偶): spouse node to left, dashed edge', () => {
    const persons = [
      makePerson('C', '子女'),
      makePerson('CS', '子女之配偶', '一般繼承', 'C')
    ];
    const { nodes, edges } = layout(persons);
    
    const c = findNode({ nodes, edges }, 'C');
    const cs = findNode({ nodes, edges }, 'CS');
    
    // C is shifted right by (NODE_WIDTH+H_GAP)/2 = 124
    // Base x for C without spouse is -104. So -104 + 124 = 20
    expect(c?.position.x).toBe(20);
    // CS is at c.cx - NODE_WIDTH/2 - H_GAP - NODE_WIDTH
    // c.cx = 20 + 104 = 124. 124 - 104 - 40 - 208 = -228
    expect(cs?.position.x).toBe(-228);
    expect(cs?.position.y).toBe(c?.position.y);
    
    const edge = findEdge({ nodes, edges }, 'C', 'CS');
    expect(edge).toBeDefined();
    // Spouse edge: horizontal with left/right handles
    expect(edge?.sourceHandle).toBe('left');
    expect(edge?.targetHandle).toBe('right');
    expect(edge?.style?.stroke).toBe('#94a3b8');
    expect(edge?.style?.strokeWidth).toBe(2);
  });

  test('Selection and errors: node data flags', () => {
    const persons = [makePerson('P1', '子女')];
    const validationErrors = [{ personId: 'P1', field: 'name', message: 'error' }];
    
    const { nodes } = layout(persons, [], 'P1', validationErrors);
    const p1 = findNode({ nodes, edges: [] }, 'P1');
    
    expect(p1?.data.isSelected).toBe(true);
    expect(p1?.data.hasErrors).toBe(true);
  });

  test('Edge styles based on status', () => {
    const persons = [
      makePerson('C1', '子女'),
      makePerson('GC1', '子女', '代位繼承', 'C1'),
      makePerson('GC2', '子女', '再轉繼承', 'C1')
    ];
    const { edges } = layout(persons);
    
    expect(findEdge({ nodes: [], edges }, 'C1', 'GC1')?.style?.strokeDasharray).toBe('5,5');
    expect(findEdge({ nodes: [], edges }, 'C1', 'GC2')?.style?.strokeDasharray).toBe('3,3');
  });

  test('SubtreeWidth does not overlap for multiple children with sub-trees', () => {
    const persons = [
      makePerson('C1', '子女'),
      makePerson('C2', '子女'),
      makePerson('GC1_1', '子女', '代位繼承', 'C1'),
      makePerson('GC1_2', '子女', '代位繼承', 'C1'),
      makePerson('GC2_1', '子女', '代位繼承', 'C2')
    ];
    const { nodes } = layout(persons);
    
    const c1 = findNode({ nodes, edges: [] }, 'C1');
    const c2 = findNode({ nodes, edges: [] }, 'C2');
    
    // They should be spaced apart properly based on subtreeWidth
    expect(c1?.position.x).not.toBe(c2?.position.x);
    // C1 requires width for 2 children = 208*2 + 40 = 456
    // C2 requires width for 1 child = 208
    // Total = 456 + 208 + 40 = 704
    // Start X = -352
    // c1.cx = -352 + 456/2 = -124 -> x = -124 - 104 = -228
    expect(c1?.position.x).toBe(-228);
    // c2.cx = -352 + 456 + 40 + 208/2 = 144 + 104 = 248 -> x = 248 - 104 = 144
    expect(c2?.position.x).toBe(144);
  });

  test('Grandparents: all 4 grandparents have unique non-overlapping positions', () => {
    const persons = [
      makePerson('F', '父'), makePerson('M', '母'),
      makePerson('GF1', '祖父'), makePerson('GM1', '祖母'),
      makePerson('GF2', '外祖父'), makePerson('GM2', '外祖母')
    ];
    const { nodes } = layout(persons);

    // D + F + M + 4 GPs = 7
    expect(nodes).toHaveLength(7);

    const gf1 = findNode({ nodes, edges: [] }, 'GF1');
    const gm1 = findNode({ nodes, edges: [] }, 'GM1');
    const gf2 = findNode({ nodes, edges: [] }, 'GF2');
    const gm2 = findNode({ nodes, edges: [] }, 'GM2');

    // All grandparents at gpY = -720
    expect(gf1?.position.y).toBe(-720);
    expect(gm1?.position.y).toBe(-720);
    expect(gf2?.position.y).toBe(-720);
    expect(gm2?.position.y).toBe(-720);

    // All x positions must be unique (no overlapping)
    const xPositions = [gf1, gm1, gf2, gm2].map(n => n?.position.x);
    const uniqueX = new Set(xPositions);
    expect(uniqueX.size).toBe(4);

    // Exact positions: fatherCx=-248, motherCx=248
    expect(gf1?.position.x).toBe(-580);
    expect(gm1?.position.x).toBe(-332);
    expect(gf2?.position.x).toBe(-84);
    expect(gm2?.position.x).toBe(164);
  });

  test('Siblings with spouse: siblings offset right past spouse', () => {
    const persons = [
      makePerson('S', '配偶'),
      makePerson('B1', '兄弟姊妹')
    ];
    const { nodes } = layout(persons);

    const b1 = findNode({ nodes, edges: [] }, 'B1');
    // siblingStartX = NODE_WIDTH + H_GAP*2 + NODE_WIDTH + H_GAP = 536
    // b1.x = 536 + 0 * (208+40) = 536
    expect(b1?.position.x).toBe(536);
  });
});
