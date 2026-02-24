import { useReducer, type ReactNode } from 'react';
import { InheritanceStateContext, InheritanceDispatchContext } from './InheritanceContextValue';
import type { Person, Decedent, Relation } from '../types/models';
import { calculateShares, type CalculationResult } from '../lib/inheritance';
import { validate, type ValidationError } from '../lib/validation';

type Snapshot = { decedent: Decedent; persons: Person[] };

const MAX_UNDO = 50;

export interface State {
  decedent: Decedent;
  persons: Person[];
  results: CalculationResult[];
  selectedPersonId: string | null;
  validationErrors: ValidationError[];
  past: Snapshot[];
  future: Snapshot[];
}

export type Action =
  | { type: 'SET_DECEDENT'; payload: Partial<Decedent> }
  | { type: 'ADD_PERSON'; payload: { relation: Relation } }
  | { type: 'UPDATE_PERSON'; payload: { id: string; updates: Partial<Person> } }
  | { type: 'ADD_SUB_HEIR'; payload: { parentId: string; relation: Relation } }
  | { type: 'DELETE_PERSON'; payload: { id: string } }
  | { type: 'SELECT_PERSON'; payload: { id: string | null } }
  | { type: 'LOAD_PERSONS'; payload: { decedent: Decedent; persons: Person[] } }
  | { type: 'RESET_STATE' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const STORAGE_KEY = 'tw-inheritance-calculator-state';

function loadFromStorage(): Snapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Snapshot;
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

const EMPTY_STATE: State = {
  decedent: { id: 'decedent', name: '' },
  persons: [],
  results: [],
  selectedPersonId: null,
  validationErrors: [],
  past: [],
  future: [],
};

function buildInitialState(): State {
  const saved = loadFromStorage();
  if (saved) {
    return {
      decedent: saved.decedent,
      persons: saved.persons,
      ...computeDerived(saved.decedent, saved.persons),
      selectedPersonId: null,
      past: [],
      future: [],
    };
  }
  return { ...EMPTY_STATE };
}

function pushUndo(state: State): { past: Snapshot[]; future: Snapshot[] } {
  const snapshot: Snapshot = { decedent: state.decedent, persons: state.persons };
  return {
    past: [...state.past.slice(-(MAX_UNDO - 1)), snapshot],
    future: [],
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DECEDENT': {
      const history = pushUndo(state);
      const decedent = { ...state.decedent, ...action.payload };
      const next = { ...state, ...history, decedent, ...computeDerived(decedent, state.persons) };
      saveToStorage(next.decedent, next.persons);
      return next;
    }
    case 'ADD_PERSON': {
      const history = pushUndo(state);
      const newPerson: Person = {
        id: generateId(),
        name: '',
        relation: action.payload.relation,
        status: '一般繼承',
      };
      const persons = [...state.persons, newPerson];
      const next = {
        ...state,
        ...history,
        persons,
        ...computeDerived(state.decedent, persons),
        selectedPersonId: newPerson.id,
      };
      saveToStorage(next.decedent, next.persons);
      return next;
    }
    case 'ADD_SUB_HEIR': {
      const history = pushUndo(state);
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
        ...history,
        persons,
        ...computeDerived(state.decedent, persons),
        selectedPersonId: newPerson.id,
      };
      saveToStorage(next.decedent, next.persons);
      return next;
    }
    case 'UPDATE_PERSON': {
      const history = pushUndo(state);
      const persons = state.persons.map(p =>
        p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
      );
      const next = { ...state, ...history, persons, ...computeDerived(state.decedent, persons) };
      saveToStorage(next.decedent, next.persons);
      return next;
    }
    case 'DELETE_PERSON': {
      const history = pushUndo(state);
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
        ...history,
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
      const history = pushUndo(state);
      const next = {
        ...state,
        ...history,
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
      return { ...EMPTY_STATE };
    }
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const currentSnapshot: Snapshot = { decedent: state.decedent, persons: state.persons };
      const next = {
        ...state,
        past: state.past.slice(0, -1),
        future: [...state.future, currentSnapshot],
        decedent: previous.decedent,
        persons: previous.persons,
        ...computeDerived(previous.decedent, previous.persons),
        selectedPersonId: null,
      };
      saveToStorage(next.decedent, next.persons);
      return next;
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next_snapshot = state.future[state.future.length - 1];
      const currentSnapshot: Snapshot = { decedent: state.decedent, persons: state.persons };
      const next = {
        ...state,
        past: [...state.past, currentSnapshot],
        future: state.future.slice(0, -1),
        decedent: next_snapshot.decedent,
        persons: next_snapshot.persons,
        ...computeDerived(next_snapshot.decedent, next_snapshot.persons),
        selectedPersonId: null,
      };
      saveToStorage(next.decedent, next.persons);
      return next;
    }
    default:
      return state;
  }
}

export function InheritanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  return (
    <InheritanceStateContext.Provider value={state}>
      <InheritanceDispatchContext.Provider value={dispatch}>
        {children}
      </InheritanceDispatchContext.Provider>
    </InheritanceStateContext.Provider>
  );
}
