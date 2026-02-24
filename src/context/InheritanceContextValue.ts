import { createContext } from 'react';
import type { State, Action } from './InheritanceContext';

export const InheritanceContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);
