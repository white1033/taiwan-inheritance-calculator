import type { Person } from '../types/models';

/**
 * Recursively count all descendants of a person.
 */
export function countDescendants(personId: string, persons: Person[]): number {
  const children = persons.filter(p => p.parentId === personId);
  return children.reduce((sum, c) => sum + 1 + countDescendants(c.id, persons), 0);
}
