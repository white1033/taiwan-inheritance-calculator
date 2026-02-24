import { useReducer, type ReactNode } from 'react';
import { InheritanceContext } from './InheritanceContextValue';
import type { Person, Decedent, Relation } from '../types/models';
import { calculateShares, type CalculationResult } from '../lib/inheritance';
import { validate, type ValidationError } from '../lib/validation';

export interface State {
  decedent: Decedent;
  persons: Person[];
  results: CalculationResult[];
  selectedPersonId: string | null;
  validationErrors: ValidationError[];
}

export type Action =
  | { type: 'SET_DECEDENT'; payload: Partial<Decedent> }
  | { type: 'ADD_PERSON'; payload: { relation: Relation } }
  | { type: 'UPDATE_PERSON'; payload: { id: string; updates: Partial<Person> } }
  | { type: 'ADD_SUB_HEIR'; payload: { parentId: string; relation: Relation } }
  | { type: 'DELETE_PERSON'; payload: { id: string } }
  | { type: 'SELECT_PERSON'; payload: { id: string | null } }
  | { type: 'LOAD_PERSONS'; payload: { decedent: Decedent; persons: Person[] } }
  | { type: 'RESET_STATE' };

const STORAGE_KEY = 'tw-inheritance-calculator-state';

function loadFromStorage(): { decedent: Decedent; persons: Person[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { decedent: Decedent; persons: Person[] };
    if (!parsed.decedent || !Array.isArray(parsed.persons)) return null;
    return { decedent: parsed.decedent, persons: parsed.persons };
  } catch {
    return null;
  }
}

function saveToStorage(decedent: Decedent, persons: Person[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ decedent, persons }));
  } catch {
    // graceful degradation if localStorage unavailable
  }
}

function generateId(): string {
  return `p_${crypto.randomUUID()}`;
}

function computeDerived(decedent: Decedent, persons: Person[]) {
  return {
    results: calculateShares(decedent, persons),
    validationErrors: validate(persons, decedent),
  };
}

function buildInitialState(): State {
  const saved = loadFromStorage();
  if (saved) {
    return {
      decedent: saved.decedent,
      persons: saved.persons,
      ...computeDerived(saved.decedent, saved.persons),
      selectedPersonId: null,
    };
  }
  return {
    decedent: { id: 'decedent', name: '' },
    persons: [],
    results: [],
    selectedPersonId: null,
    validationErrors: [],
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DECEDENT': {
      const decedent = { ...state.decedent, ...action.payload };
      const next = { ...state, decedent, ...computeDerived(decedent, state.persons) };
      saveToStorage(next.decedent, next.persons);
      return next;
    }
    case 'ADD_PERSON': {
      const newPerson: Person = {
        id: generateId(),
        name: '',
        relation: action.payload.relation,
        status: '一般繼承',
      };
      const persons = [...state.persons, newPerson];
      const next = {
        ...state,
        persons,
        ...computeDerived(state.decedent, persons),
        selectedPersonId: newPerson.id,
      };
      saveToStorage(next.decedent, next.persons);
      return next;
    }
    case 'ADD_SUB_HEIR': {
      const parent = state.persons.find(p => p.id === action.payload.parentId);
      let status: Person['status'] = '一般繼承';
      if (parent) {
        if (parent.status === '死亡' || parent.status === '死亡絕嗣') {
          status = '代位繼承';
        } else if (parent.status === '再轉繼承') {
          status = '再轉繼承';
        }
      }
      const newPerson: Person = {
        id: generateId(),
        name: '',
        relation: action.payload.relation,
        status,
        parentId: action.payload.parentId,
      };
      const persons = [...state.persons, newPerson];
      const next = {
        ...state,
        persons,
        ...computeDerived(state.decedent, persons),
        selectedPersonId: newPerson.id,
      };
      saveToStorage(next.decedent, next.persons);
      return next;
    }
    case 'UPDATE_PERSON': {
      const persons = state.persons.map(p =>
        p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
      );
      const next = { ...state, persons, ...computeDerived(state.decedent, persons) };
      saveToStorage(next.decedent, next.persons);
      return next;
    }
    case 'DELETE_PERSON': {
      const idsToDelete = new Set<string>();
      function collectDescendants(id: string) {
        idsToDelete.add(id);
        for (const p of state.persons) {
          if (p.parentId === id && !idsToDelete.has(p.id)) {
            collectDescendants(p.id);
          }
        }
      }
      collectDescendants(action.payload.id);
      const persons = state.persons.filter(p => !idsToDelete.has(p.id));
      const next = {
        ...state,
        persons,
        ...computeDerived(state.decedent, persons),
        selectedPersonId:
          idsToDelete.has(state.selectedPersonId ?? '') ? null : state.selectedPersonId,
      };
      saveToStorage(next.decedent, next.persons);
      return next;
    }
    case 'SELECT_PERSON': {
      return { ...state, selectedPersonId: action.payload.id };
    }
    case 'LOAD_PERSONS': {
      const next = {
        ...state,
        decedent: action.payload.decedent,
        persons: action.payload.persons,
        ...computeDerived(action.payload.decedent, action.payload.persons),
        selectedPersonId: null,
      };
      saveToStorage(next.decedent, next.persons);
      return next;
    }
    case 'RESET_STATE': {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // graceful degradation
      }
      return {
        decedent: { id: 'decedent', name: '' },
        persons: [],
        results: [],
        selectedPersonId: null,
        validationErrors: [],
      };
    }
    default:
      return state;
  }
}

export function InheritanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  return (
    <InheritanceContext.Provider value={{ state, dispatch }}>
      {children}
    </InheritanceContext.Provider>
  );
}
