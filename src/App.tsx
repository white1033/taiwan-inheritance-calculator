import { useState, useCallback } from 'react';
import { InheritanceProvider } from './context/InheritanceContext.tsx';
import { Header } from './components/Header.tsx';
import { LeftPanel } from './components/LeftPanel.tsx';
import { FamilyTree } from './components/FamilyTree.tsx';
import { ExportToolbar } from './components/ExportToolbar.tsx';

export default function App() {
  const [panelOpen, setPanelOpen] = useState(false);

  const togglePanel = useCallback(() => setPanelOpen(prev => !prev), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  return (
    <InheritanceProvider>
      <div id="app-root" className="h-screen flex flex-col">
        <Header onTogglePanel={togglePanel} />
        <div className="flex-1 flex overflow-hidden relative">
          <LeftPanel open={panelOpen} onClose={closePanel} />
          {/* Overlay for mobile when panel is open */}
          {panelOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black/30 z-30"
              onClick={closePanel}
              aria-hidden="true"
            />
          )}
          <main id="family-tree" className="flex-1">
            <FamilyTree />
          </main>
        </div>
        <ExportToolbar />
      </div>
    </InheritanceProvider>
  );
}
