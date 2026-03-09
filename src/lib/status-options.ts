import type { Person, Decedent, InheritanceStatus } from '../types/models';

/**
 * Compute the valid status choices for a person given their role in the
 * inheritance chain. Used by PersonEditor to filter the status dropdown.
 */
export function computeAvailableStatuses(
  person: Person,
  persons: Person[],
  decedent?: Decedent,
): InheritanceStatus[] {
  // 子女之配偶 can only ever be 再轉繼承 — skip backward compat entirely
  if (person.relation === '子女之配偶') {
    return ['再轉繼承'];
  }

  let options: InheritanceStatus[];

  if (!person.parentId) {
    // Top-level heir: 代位繼承 doesn't apply, but 再轉繼承 does (when heir dies after decedent)
    // 配偶 excluded since spouse re-transfer isn't supported in this calculator
    options = person.relation === '配偶'
      ? ['一般繼承', '死亡', '死亡絕嗣', '拋棄繼承']
      : ['一般繼承', '死亡', '死亡絕嗣', '拋棄繼承', '再轉繼承'];
  } else {
    const parent = persons.find(p => p.id === person.parentId);

    if (parent?.status === '再轉繼承') {
      options = ['再轉繼承', '拋棄繼承'];
    } else if (parent?.status === '死亡') {
      // Parent died after decedent → re-transfer inheritance (再轉繼承)
      // If either deathDate is missing, treat conservatively as ≤ (代位繼承 scenario)
      const isAfterDecedent =
        parent.deathDate != null &&
        decedent?.deathDate != null &&
        parent.deathDate > decedent.deathDate;
      options = isAfterDecedent
        ? ['再轉繼承', '拋棄繼承']
        : ['代位繼承', '死亡絕嗣', '拋棄繼承'];
    } else if (parent?.status === '代位繼承') {
      options = ['代位繼承', '死亡絕嗣', '拋棄繼承'];
    } else {
      // Unknown or missing parent status
      options = ['代位繼承', '再轉繼承', '死亡絕嗣', '拋棄繼承'];
    }
  }

  // Backward compat: prepend current status if not already in the list
  if (!options.includes(person.status)) {
    options = [person.status, ...options];
  }

  return options;
}
