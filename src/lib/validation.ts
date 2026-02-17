import type { Person, Decedent } from '../types/models';

export interface ValidationError {
  personId: string;
  field: string;
  message: string;
}

export function validate(persons: Person[], _decedent: Decedent): ValidationError[] {
  const errors: ValidationError[] = [];
  const personIds = new Set(persons.map(p => p.id));
  let spouseCount = 0;

  for (const p of persons) {
    if (!p.name.trim()) {
      errors.push({ personId: p.id, field: 'name', message: '姓名不可為空' });
    }

    if (p.relation === '配偶') {
      spouseCount++;
      if (spouseCount > 1) {
        errors.push({ personId: p.id, field: 'relation', message: '配偶最多只能有一位' });
      }
    }

    if (p.status === '代位繼承') {
      if (!p.parentId) {
        errors.push({ personId: p.id, field: 'parentId', message: '代位繼承人必須選擇被代位者' });
      } else if (!personIds.has(p.parentId)) {
        errors.push({ personId: p.id, field: 'parentId', message: '被代位者不存在' });
      }
    }

    if ((p.status === '死亡' || p.status === '死亡絕嗣') && !p.deathDate) {
      errors.push({ personId: p.id, field: 'deathDate', message: '死亡狀態必須填寫死亡日期' });
    }
  }

  return errors;
}
