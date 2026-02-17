import type { Fraction } from './fraction';
import { frac, divide, multiply, ZERO } from './fraction';
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
function reservedRatio(relation: Relation, activeOrder: number | null): Fraction {
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
      return true;
    });

    if (orderPersons.length === 0) continue;

    // Check if at least one person in this order is not renounced
    const hasActive = orderPersons.some(p => p.status !== '拋棄繼承');

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
  if (persons.length === 0) return [];

  // Find the spouse (if any)
  const spouse = persons.find(p => p.relation === '配偶' && p.status === '一般繼承');

  // Determine the active inheritance order
  const activeOrder = determineActiveOrder(persons);

  // Get spouse share type
  const spouseShareType = spouse ? getSpouseFixedShare(activeOrder) : null;

  // Collect the "slot" holders in the active order.
  // A "slot" is a direct heir position. Dead heirs with representation or
  // re-transfer heirs still count as a slot.
  const slotHolders = activeOrder !== null
    ? persons.filter(p => {
        const pOrder = getOrder(p.relation);
        if (pOrder !== activeOrder) return false;
        // Must be a direct heir (not a sub-heir)
        if (p.status === '代位繼承') return false;
        if (p.status === '再轉繼承' && p.parentId) return false;
        // Renounced heirs do not count as slots
        if (p.status === '拋棄繼承') return false;
        return true;
      })
    : [];

  // Total number of "slots" for share division
  const totalSlots = slotHolders.length + (spouse ? 1 : 0);

  // Build results
  const results: CalculationResult[] = [];

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
        reservedShare: multiply(perSlot, reservedRatio('配偶', activeOrder)),
      });
    }

    for (const holder of slotHolders) {
      processSlotHolder(holder, perSlot, activeOrder, persons, results);
    }
  } else if (spouseShareType !== null && activeOrder !== null) {
    // Orders 2, 3, 4: spouse gets fixed share, others split remainder
    const spouseShare = spouseShareType as Fraction;
    const remainder = frac(1, 1);
    const othersTotal = { n: remainder.n * spouseShare.d - spouseShare.n * remainder.d, d: remainder.d * spouseShare.d };
    const othersShare = frac(othersTotal.n, othersTotal.d); // 1 - spouseShare

    if (spouse) {
      results.push({
        id: spouse.id,
        name: spouse.name,
        relation: spouse.relation,
        inheritanceShare: spouseShare,
        reservedShare: multiply(spouseShare, reservedRatio('配偶', activeOrder)),
      });
    }

    // Split othersShare equally among slot holders
    const numSlots = slotHolders.length;
    for (const holder of slotHolders) {
      const perSlot = numSlots > 0 ? divide(othersShare, frac(numSlots)) : ZERO;
      processSlotHolder(holder, perSlot, activeOrder, persons, results);
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
        reservedShare: multiply(spouseShare, reservedRatio('配偶', activeOrder)),
      });
    }
  } else if (activeOrder !== null) {
    // No spouse, only order heirs
    const numSlots = slotHolders.length;
    for (const holder of slotHolders) {
      const perSlot = numSlots > 0 ? frac(1, numSlots) : ZERO;
      processSlotHolder(holder, perSlot, activeOrder, persons, results);
    }
  }

  // Add zero-share entries for all persons not yet in results
  // (e.g., renounced heirs, dead heirs whose slot was processed)
  for (const p of persons) {
    if (!results.find(r => r.id === p.id)) {
      results.push({
        id: p.id,
        name: p.name,
        relation: p.relation,
        inheritanceShare: ZERO,
        reservedShare: ZERO,
      });
    }
  }

  return results;
}

/**
 * Process a slot holder. If the holder is alive and active, they get the full slot share.
 * If the holder is dead with representation heirs, the slot share is split among them.
 * If the holder is a re-transfer origin, the slot share is split among their sub-heirs.
 */
function processSlotHolder(
  holder: Person,
  slotShare: Fraction,
  activeOrder: number | null,
  persons: Person[],
  results: CalculationResult[],
): void {
  if (holder.status === '一般繼承') {
    // Active heir gets full slot share
    results.push({
      id: holder.id,
      name: holder.name,
      relation: holder.relation,
      inheritanceShare: slotShare,
      reservedShare: multiply(slotShare, reservedRatio(holder.relation, activeOrder)),
    });
  } else if (holder.status === '死亡' || holder.status === '死亡絕嗣') {
    // Dead heir: check for representation heirs
    const repHeirs = persons.filter(
      p => p.status === '代位繼承' && p.parentId === holder.id
    );

    if (repHeirs.length > 0) {
      // The dead holder gets zero; their share is split among representation heirs
      results.push({
        id: holder.id,
        name: holder.name,
        relation: holder.relation,
        inheritanceShare: ZERO,
        reservedShare: ZERO,
      });

      const perRep = divide(slotShare, frac(repHeirs.length));
      for (const rep of repHeirs) {
        results.push({
          id: rep.id,
          name: rep.name,
          relation: rep.relation,
          inheritanceShare: perRep,
          reservedShare: multiply(perRep, reservedRatio(rep.relation, activeOrder)),
        });
      }
    } else {
      // Dead with no representation heirs: slot is lost (zero share)
      results.push({
        id: holder.id,
        name: holder.name,
        relation: holder.relation,
        inheritanceShare: ZERO,
        reservedShare: ZERO,
      });
    }
  } else if (holder.status === '再轉繼承') {
    // Re-transfer: heir died AFTER decedent. Their share goes to their own heirs.
    const subHeirs = persons.filter(
      p => p.status === '再轉繼承' && p.parentId === holder.id
    );

    // The re-transfer origin gets zero
    results.push({
      id: holder.id,
      name: holder.name,
      relation: holder.relation,
      inheritanceShare: ZERO,
      reservedShare: ZERO,
    });

    if (subHeirs.length > 0) {
      const perSub = divide(slotShare, frac(subHeirs.length));
      for (const sub of subHeirs) {
        results.push({
          id: sub.id,
          name: sub.name,
          relation: sub.relation,
          inheritanceShare: perSub,
          reservedShare: multiply(perSub, reservedRatio(sub.relation, activeOrder)),
        });
      }
    }
  }
}
