import { createContext, useContext, useReducer, type ReactNode } from 'react';
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
  | { type: 'LOAD_PERSONS'; payload: { decedent: Decedent; persons: Person[] } };

function generateId(): string {
  return `p_${crypto.randomUUID()}`;
}

const initialState: State = {
  decedent: { id: 'decedent', name: '' },
  persons: [],
  results: [],
  selectedPersonId: null,
  validationErrors: [],
};

function computeDerived(decedent: Decedent, persons: Person[]) {
  return {
    results: calculateShares(decedent, persons),
    validationErrors: validate(persons, decedent),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DECEDENT': {
      const decedent = { ...state.decedent, ...action.payload };
      return { ...state, decedent, ...computeDerived(decedent, state.persons) };
    }
    case 'ADD_PERSON': {
      const newPerson: Person = {
        id: generateId(),
        name: '',
        relation: action.payload.relation,
        status: '一般繼承',
      };
      const persons = [...state.persons, newPerson];
      return {
        ...state,
        persons,
        ...computeDerived(state.decedent, persons),
        selectedPersonId: newPerson.id,
      };
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
      return {
        ...state,
        persons,
        ...computeDerived(state.decedent, persons),
        selectedPersonId: newPerson.id,
      };
    }
    case 'UPDATE_PERSON': {
      const persons = state.persons.map(p =>
        p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
      );
      return { ...state, persons, ...computeDerived(state.decedent, persons) };
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
      return {
        ...state,
        persons,
        ...computeDerived(state.decedent, persons),
        selectedPersonId:
          idsToDelete.has(state.selectedPersonId ?? '') ? null : state.selectedPersonId,
      };
    }
    case 'SELECT_PERSON': {
      return { ...state, selectedPersonId: action.payload.id };
    }
    case 'LOAD_PERSONS': {
      return {
        ...state,
        decedent: action.payload.decedent,
        persons: action.payload.persons,
        ...computeDerived(action.payload.decedent, action.payload.persons),
        selectedPersonId: null,
      };
    }
    default:
      return state;
  }
}

const InheritanceContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function InheritanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <InheritanceContext.Provider value={{ state, dispatch }}>
      {children}
    </InheritanceContext.Provider>
  );
}

export function useInheritance() {
  const context = useContext(InheritanceContext);
  if (!context) throw new Error('useInheritance must be used within InheritanceProvider');
  return context;
}
