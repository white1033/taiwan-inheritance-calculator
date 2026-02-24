import { useContext } from 'react';
import { InheritanceContext } from '../context/InheritanceContextValue';

export function useInheritance() {
  const context = useContext(InheritanceContext);
  if (!context) throw new Error('useInheritance must be used within InheritanceProvider');
  return context;
}
