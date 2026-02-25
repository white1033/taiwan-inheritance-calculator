import type { Person, Decedent } from '../types/models';
import { getOrder } from '../types/models';

export interface ValidationError {
  personId: string;
  field: string;
  message: string;
}

export function validate(persons: Person[], _decedent?: Decedent): ValidationError[] {
  const errors: ValidationError[] = [];
  const personIds = new Set(persons.map(p => p.id));
  const personMap = new Map(persons.map(p => [p.id, p]));

  const currentSpouseCount = new Map<string, number>();

  for (const p of persons) {
    if (!p.name.trim()) {
      errors.push({ personId: p.id, field: 'name', message: '姓名不可為空' });
    }

    if (p.relation === '配偶' || p.relation === '子女之配偶') {
      if (!p.divorceDate) {
        const key = p.parentId || '__root__';
        const count = (currentSpouseCount.get(key) ?? 0) + 1;
        currentSpouseCount.set(key, count);
        if (count > 1) {
          errors.push({ personId: p.id, field: 'relation', message: '配偶最多只能有一位' });
        }
      }
    }

    if (p.status === '代位繼承') {
      if (!p.parentId) {
        errors.push({ personId: p.id, field: 'parentId', message: '代位繼承人必須選擇被代位者' });
      } else if (!personIds.has(p.parentId)) {
        errors.push({ personId: p.id, field: 'parentId', message: '被代位者不存在' });
      } else {
        const parent = personMap.get(p.parentId);
        if (parent && parent.status !== '死亡' && parent.status !== '死亡絕嗣') {
          errors.push({ personId: p.id, field: 'parentId', message: '代位繼承的被代位者必須為死亡狀態' });
        }
        // 1-2: 代位繼承僅限第一順位（民法 §1140）
        if (parent) {
          const parentOrder = getOrder(parent.relation);
          if (parentOrder !== 1 && parentOrder !== null) {
            errors.push({ personId: p.id, field: 'status', message: '代位繼承僅適用於直系血親卑親屬（第一順位）' });
          }
        }
      }
    }

    // 1-3: 死亡絕嗣者不應有代位繼承人
    if (p.parentId) {
      const parent = personMap.get(p.parentId);
      if (parent && parent.status === '死亡絕嗣') {
        errors.push({ personId: p.id, field: 'parentId', message: '死亡絕嗣者不應有代位繼承人' });
      }
    }

    // 1-4: 再轉繼承的 parent 狀態驗證
    if (p.status === '再轉繼承' && p.parentId) {
      const parent = personMap.get(p.parentId);
      if (parent && parent.status !== '再轉繼承' && parent.status !== '死亡') {
        errors.push({ personId: p.id, field: 'parentId', message: '再轉繼承的被繼承者必須為再轉繼承或死亡狀態' });
      }
    }

    // 1-5: 離婚配偶警告
    if (p.relation === '配偶' && p.divorceDate && p.status === '一般繼承') {
      errors.push({ personId: p.id, field: 'divorceDate', message: '已離婚之配偶不具繼承權，應繼分將為零' });
    }

    if ((p.status === '死亡' || p.status === '死亡絕嗣') && !p.deathDate) {
      errors.push({ personId: p.id, field: 'deathDate', message: '死亡狀態必須填寫死亡日期' });
    }
  }

  // Circular parentId check
  for (const p of persons) {
    if (!p.parentId) continue;
    const visited = new Set<string>();
    let current: string | undefined = p.id;
    while (current) {
      if (visited.has(current)) {
        errors.push({ personId: p.id, field: 'parentId', message: '親屬關係存在循環參照' });
        break;
      }
      visited.add(current);
      current = personMap.get(current)?.parentId;
    }
  }

  return errors;
}
