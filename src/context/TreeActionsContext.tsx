import { createContext, useContext } from 'react';

export interface TreeActions {
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onContextMenu: (id: string, isDecedent: boolean, event: React.MouseEvent) => void;
  onAddChild: (id: string) => void;
  onAddSpouse: (id: string) => void;
}

export const TreeActionsContext = createContext<TreeActions | null>(null);

export function useTreeActions(): TreeActions {
  const ctx = useContext(TreeActionsContext);
  if (!ctx) throw new Error('useTreeActions must be used within a TreeActionsProvider');
  return ctx;
}
