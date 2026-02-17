import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Person, Decedent, Relation } from '../types/models';
import { calculateShares, type CalculationResult } from '../lib/inheritance';

export interface State {
  decedent: Decedent;
  persons: Person[];
  results: CalculationResult[];
  selectedPersonId: string | null;
}

export type Action =
  | { type: 'SET_DECEDENT'; payload: Partial<Decedent> }
  | { type: 'ADD_PERSON'; payload: { relation: Relation } }
  | { type: 'UPDATE_PERSON'; payload: { id: string; updates: Partial<Person> } }
  | { type: 'DELETE_PERSON'; payload: { id: string } }
  | { type: 'SELECT_PERSON'; payload: { id: string | null } }
  | { type: 'LOAD_PERSONS'; payload: { decedent: Decedent; persons: Person[] } };

let nextId = 1;
function generateId(): string {
  return `p_${nextId++}`;
}

function recalculate(decedent: Decedent, persons: Person[]): CalculationResult[] {
  return calculateShares(decedent, persons);
}

const initialState: State = {
  decedent: { id: 'decedent', name: '', deathDate: '' },
  persons: [],
  results: [],
  selectedPersonId: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_DECEDENT': {
      const decedent = { ...state.decedent, ...action.payload };
      return { ...state, decedent, results: recalculate(decedent, state.persons) };
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
        results: recalculate(state.decedent, persons),
        selectedPersonId: newPerson.id,
      };
    }
    case 'UPDATE_PERSON': {
      const persons = state.persons.map(p =>
        p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
      );
      return { ...state, persons, results: recalculate(state.decedent, persons) };
    }
    case 'DELETE_PERSON': {
      const persons = state.persons.filter(p => p.id !== action.payload.id);
      return {
        ...state,
        persons,
        results: recalculate(state.decedent, persons),
        selectedPersonId:
          state.selectedPersonId === action.payload.id ? null : state.selectedPersonId,
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
        results: recalculate(action.payload.decedent, action.payload.persons),
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
