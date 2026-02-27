import { useState, useCallback } from 'react';
import { InheritanceProvider } from './context/InheritanceContext.tsx';
import { Header } from './components/Header.tsx';
import { LeftPanel } from './components/LeftPanel.tsx';
import { FamilyTree } from './components/FamilyTree.tsx';
import { ToastProvider } from './components/Toast.tsx';
import { useUndoRedoShortcuts } from './hooks/useUndoRedoShortcuts.ts';
import { useInheritance } from './hooks/useInheritance.ts';

function AppContent() {
  const [panelOpen, setPanelOpen] = useState(false);
  const togglePanel = useCallback(() => setPanelOpen(prev => !prev), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const { state, dispatch } = useInheritance();
  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch]);
  const handleRedo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch]);
  useUndoRedoShortcuts();
  return (
    <ToastProvider>
      <div id="app-root" className="h-screen flex flex-col">
        <Header
          onTogglePanel={togglePanel}
          panelOpen={panelOpen}
          canUndo={state.past.length > 0}
          canRedo={state.future.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
        <div className="flex-1 flex overflow-hidden relative">
          <LeftPanel open={panelOpen} onClose={closePanel} />
          {panelOpen && (
            <div
              className="no-print md:hidden fixed inset-0 bg-black/30 z-30"
              onClick={closePanel}
              aria-hidden="true"
            />
          )}
          <main id="family-tree" className="flex-1 relative">
            <FamilyTree />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
export default function App() {
  return (
    <InheritanceProvider>
      <AppContent />
    </InheritanceProvider>
  );
}
