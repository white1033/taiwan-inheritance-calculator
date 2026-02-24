import { createContext } from 'react';
import type { State, Action } from './InheritanceContext';

export const InheritanceStateContext = createContext<State | null>(null);

export const InheritanceDispatchContext = createContext<React.Dispatch<Action> | null>(null);
