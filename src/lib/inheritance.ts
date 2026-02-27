import type { Fraction } from './fraction';
import { frac, add, subtract, divide, multiply, equals, ZERO, ONE } from './fraction';
import type { Person, Decedent, Relation } from '../types/models';
import { getOrder } from '../types/models';

/**
 * Result of inheritance share calculation for a single person.
 */
export interface CalculationResult {
  id: string;
  name: string;
  relation: Relation;
  inheritanceShare: Fraction;
  reservedShare: Fraction;
}

/**
 * Determine the reserved share ratio for a given relation and active order.
 *
 * Art. 1223 of Taiwan Civil Code:
 * - Children, Parents, Spouse: reserved = 1/2 of statutory share
 * - Siblings, Grandparents: reserved = 1/3 of statutory share
 */
function reservedRatio(relation: Relation): Fraction {
  const order = getOrder(relation);

  // Spouse reserved ratio depends on which order they co-inherit with
  if (relation === '配偶') {
    // Spouse with 1st order (children) or 2nd order (parents): 1/2
    // Spouse with 3rd order (siblings) or 4th order (grandparents): 1/2
    // Spouse alone: 1/2
    // Per Art. 1223, spouse always gets 1/2 of statutory share
    return frac(1, 2);
  }

  if (order === 1 || order === 2) {
    // Children or Parents: 1/2 of statutory share
    return frac(1, 2);
  }

  if (order === 3 || order === 4) {
    // Siblings or Grandparents: 1/3 of statutory share
    return frac(1, 3);
  }

  return ZERO;
}

/**
 * Check if a person has any living descendant (recursively).
 * A "living" descendant is one who is not 拋棄繼承, 死亡, or 死亡絕嗣,
 * or who is dead but has their own living descendants.
 */
function hasLivingDescendant(personId: string, persons: Person[], visited = new Set<string>()): boolean {
  if (visited.has(personId)) return false;
  visited.add(personId);
  const children = persons.filter(p => p.parentId === personId);
  for (const child of children) {
    if (child.status !== '拋棄繼承' && child.status !== '死亡' && child.status !== '死亡絕嗣') {
      return true;
    }
    if ((child.status === '死亡' || child.status === '死亡絕嗣') && hasLivingDescendant(child.id, persons, visited)) {
      return true;
    }
  }
  return false;
}

/**
 * Determine which inheritance order is active.
 * We check orders 1 through 4 and return the first order that has
 * at least one active heir (not renounced). An "active" heir in an order
 * is one whose status is '一般繼承', or who is dead/lost-rights but has
 * representation heirs (代位繼承), or who is a re-transfer origin (再轉繼承).
 *
 * Returns null if no order is active (e.g., only spouse or no one).
 */
function determineActiveOrder(persons: Person[]): number | null {
  for (const order of [1, 2, 3, 4]) {
    // Get all persons in this order (direct heirs, not representation/re-transfer sub-heirs)
    const orderPersons = persons.filter(p => {
      const pOrder = getOrder(p.relation);
      if (pOrder !== order) return false;
      // Only consider direct heirs in this order, not sub-heirs (those with parentId
      // who are 代位繼承 or 再轉繼承 sub-heirs)
      if (p.status === '代位繼承' || (p.status === '再轉繼承' && p.parentId)) return false;
      // Exclude persons with parentId who are not 代位/再轉 sub-heirs (e.g. grandchildren with 一般繼承)
      if (p.parentId && p.status !== '代位繼承' && p.status !== '再轉繼承') return false;
      return true;
    });

    if (orderPersons.length === 0) continue;

    // Check if at least one person in this order is actively inheritable
    const hasActive = orderPersons.some(p => {
      if (p.status === '拋棄繼承') return false;
      if (p.status === '死亡' || p.status === '死亡絕嗣') {
        return hasLivingDescendant(p.id, persons);
      }
      if (p.status === '再轉繼承' && !p.parentId) {
        return persons.some(sub => sub.status === '再轉繼承' && sub.parentId === p.id);
      }
      return true;
    });

    if (hasActive) return order;
  }

  return null;
}

/**
 * Get the spouse's fixed share fraction based on active order.
 *
 * Art. 1144:
 * - With 1st order: equal share (calculated dynamically)
 * - With 2nd order: 1/2
 * - With 3rd order: 1/2
 * - With 4th order: 2/3
 * - Alone: 1/1
 */
function getSpouseFixedShare(activeOrder: number | null): Fraction | 'equal' {
  if (activeOrder === null) return frac(1, 1); // spouse alone
  if (activeOrder === 1) return 'equal'; // equal share with children
  if (activeOrder === 2) return frac(1, 2);
  if (activeOrder === 3) return frac(1, 2);
  if (activeOrder === 4) return frac(2, 3);
  return frac(1, 1);
}

/**
 * Main calculation function.
 *
 * Implements Taiwan Civil Code inheritance rules:
 * - Art. 1138: Inheritance order
 * - Art. 1141: Equal per capita division
 * - Art. 1144: Spouse share rules
 * - Art. 1140: Representation inheritance (代位繼承)
 * - Re-transfer inheritance (再轉繼承)
 * - Art. 1223: Reserved shares (特留分)
 */
export function calculateShares(decedent: Decedent, persons: Person[]): CalculationResult[] {
  void decedent; // reserved for future use (e.g., deathDate-based logic)
  if (persons.length === 0) return [];

  // Find the spouse (if any)
  const spouse = persons.find(p => p.relation === '配偶' && p.status === '一般繼承' && !p.divorceDate);

  // Determine the active inheritance order
  const activeOrder = determineActiveOrder(persons);

  // Get spouse share type
  const spouseShareType = spouse ? getSpouseFixedShare(activeOrder) : null;

  // Collect the "slot" holders in the active order.
  // A "slot" is a direct heir position. Dead heirs count as a slot only if
  // they have representation sub-heirs; otherwise their share redistributes
  // to remaining heirs. Same for re-transfer origins without sub-heirs.
  const slotHolders = activeOrder !== null
    ? persons.filter(p => {
        const pOrder = getOrder(p.relation);
        if (pOrder !== activeOrder) return false;
        if (p.status === '代位繼承') return false;
        if (p.status === '再轉繼承' && p.parentId) return false;
        // Exclude persons with parentId who are not 代位/再轉 sub-heirs
        if (p.parentId && p.status !== '代位繼承' && p.status !== '再轉繼承') return false;
        if (p.status === '拋棄繼承') return false;
        if (p.status === '死亡' || p.status === '死亡絕嗣') {
          return hasLivingDescendant(p.id, persons);
        }
        if (p.status === '再轉繼承' && !p.parentId) {
          return persons.some(sub => sub.status === '再轉繼承' && sub.parentId === p.id);
        }
        return true;
      })
    : [];

  // Total number of "slots" for share division
  const totalSlots = slotHolders.length + (spouse ? 1 : 0);

  // Build results
  const results: CalculationResult[] = [];
  // Shared visited set prevents duplicate results when paths converge
  const visited = new Set<string>();

  // Calculate shares
  if (spouseShareType === 'equal') {
    // First order: spouse gets equal share with children
    // Total slots = spouse + active children (including dead-with-representation and re-transfer)
    const perSlot = totalSlots > 0 ? frac(1, totalSlots) : ZERO;

    if (spouse) {
      results.push({
        id: spouse.id,
        name: spouse.name,
        relation: spouse.relation,
        inheritanceShare: perSlot,
        reservedShare: multiply(perSlot, reservedRatio('配偶')),
      });
    }

    for (const holder of slotHolders) {
      processSlotHolder(holder, perSlot, persons, results, visited);
    }
  } else if (spouseShareType !== null && activeOrder !== null) {
    // Orders 2, 3, 4: spouse gets fixed share, others split remainder
    const spouseShare = spouseShareType as Fraction;
    const othersShare = subtract(frac(1, 1), spouseShare);

    if (spouse) {
      results.push({
        id: spouse.id,
        name: spouse.name,
        relation: spouse.relation,
        inheritanceShare: spouseShare,
        reservedShare: multiply(spouseShare, reservedRatio('配偶')),
      });
    }

    // Split othersShare equally among slot holders
    const numSlots = slotHolders.length;
    for (const holder of slotHolders) {
      const perSlot = numSlots > 0 ? divide(othersShare, frac(numSlots)) : ZERO;
      processSlotHolder(holder, perSlot, persons, results, visited);
    }
  } else if (spouseShareType !== null && activeOrder === null) {
    // Spouse alone
    if (spouse) {
      const spouseShare = frac(1, 1);
      results.push({
        id: spouse.id,
        name: spouse.name,
        relation: spouse.relation,
        inheritanceShare: spouseShare,
        reservedShare: multiply(spouseShare, reservedRatio('配偶')),
      });
    }
  } else if (activeOrder !== null) {
    // No spouse, only order heirs
    const numSlots = slotHolders.length;
    for (const holder of slotHolders) {
      const perSlot = numSlots > 0 ? frac(1, numSlots) : ZERO;
      processSlotHolder(holder, perSlot, persons, results, visited);
    }
  }

  // Add zero-share entries for all persons not yet in results
  // (e.g., renounced heirs, dead heirs whose slot was processed)
  const resultIds = new Set(results.map(r => r.id));
  for (const p of persons) {
    if (!resultIds.has(p.id)) {
      results.push({
        id: p.id,
        name: p.name,
        relation: p.relation,
        inheritanceShare: ZERO,
        reservedShare: ZERO,
      });
    }
  }


  // Sanity check: all shares must sum to 1 (or 0 if no heirs)
  const totalShare = results.reduce((sum, r) => add(sum, r.inheritanceShare), ZERO);
  const expectedTotal = results.some(r => r.inheritanceShare.n > 0) ? ONE : ZERO;
  if (!equals(totalShare, expectedTotal)) {
    throw new Error(
      `Inheritance share invariant violated: shares sum to ${totalShare.n}/${totalShare.d}, ` +
      `expected ${expectedTotal.n}/${expectedTotal.d}`
    );
  }

  return results;
}

/**
 * Push a zero-share result entry for a person.
 */
function pushZeroResult(person: Person, results: CalculationResult[]): void {
  results.push({
    id: person.id,
    name: person.name,
    relation: person.relation,
    inheritanceShare: ZERO,
    reservedShare: ZERO,
  });
}

/**
 * Push a result entry with the given share for a person.
 */
function pushShareResult(person: Person, share: Fraction, results: CalculationResult[]): void {
  results.push({
    id: person.id,
    name: person.name,
    relation: person.relation,
    inheritanceShare: share,
    reservedShare: multiply(share, reservedRatio(person.relation)),
  });
}

/**
 * Distribute a share among sub-heirs of a dead person.
 *
 * This handles the recursive case for both representation (代位) and
 * re-transfer (再轉) inheritance: find direct sub-heirs, split the share
 * equally, and recurse if any sub-heir also has their own sub-heirs.
 *
 * @param parentId  - The dead person whose share is being distributed
 * @param share     - The share to distribute
 * @param status    - The sub-heir status to look for ('代位繼承' or '再轉繼承')
 * @param persons   - All persons in the case
 * @param results   - Accumulator for calculation results
 * @param visited   - Cycle detection set
 */
function distributeShare(
  parentId: string,
  share: Fraction,
  status: '代位繼承' | '再轉繼承',
  persons: Person[],
  results: CalculationResult[],
  visited: Set<string>,
): void {
  const subHeirs = persons.filter(
    p => p.status === status && p.parentId === parentId
  );

  if (subHeirs.length === 0) return;

  const perHeir = divide(share, frac(subHeirs.length));
  for (const heir of subHeirs) {
    if (visited.has(heir.id)) {
      pushZeroResult(heir, results);
      continue;
    }
    visited.add(heir.id);

    // Check if this sub-heir also has their own sub-heirs (next level)
    const hasOwnSubHeirs = persons.some(
      p => p.status === status && p.parentId === heir.id
    );

    if (hasOwnSubHeirs) {
      // This heir is dead with sub-heirs — record zero and recurse
      pushZeroResult(heir, results);
      distributeShare(heir.id, perHeir, status, persons, results, visited);
    } else {
      pushShareResult(heir, perHeir, results);
    }
  }
}

/**
 * Process a slot holder. If the holder is alive and active, they get the full slot share.
 * If the holder is dead with representation heirs, the slot share is distributed among them.
 * If the holder is a re-transfer origin, the slot share is distributed among their sub-heirs.
 */
function processSlotHolder(
  holder: Person,
  slotShare: Fraction,
  persons: Person[],
  results: CalculationResult[],
  visited = new Set<string>(),
): void {
  if (visited.has(holder.id)) {
    pushZeroResult(holder, results);
    return;
  }
  visited.add(holder.id);

  if (holder.status === '一般繼承') {
    pushShareResult(holder, slotShare, results);
  } else if (holder.status === '死亡' || holder.status === '死亡絕嗣') {
    pushZeroResult(holder, results);
    distributeShare(holder.id, slotShare, '代位繼承', persons, results, visited);
  } else if (holder.status === '再轉繼承') {
    pushZeroResult(holder, results);
    distributeShare(holder.id, slotShare, '再轉繼承', persons, results, visited);
  }
}
