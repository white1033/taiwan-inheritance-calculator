import { useContext } from 'react';
import { InheritanceStateContext, InheritanceDispatchContext } from '../context/InheritanceContextValue';

export function useInheritance() {
  const state = useContext(InheritanceStateContext);
  const dispatch = useContext(InheritanceDispatchContext);
  if (!state || !dispatch) throw new Error('useInheritance must be used within InheritanceProvider');
  return { state, dispatch };
}
