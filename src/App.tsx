import { InheritanceProvider } from './context/InheritanceContext.tsx';
import { Header } from './components/Header.tsx';
import { LeftPanel } from './components/LeftPanel.tsx';
import { FamilyTree } from './components/FamilyTree.tsx';
import { ExportToolbar } from './components/ExportToolbar.tsx';

export default function App() {
  return (
    <InheritanceProvider>
      <div id="app-root" className="h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <LeftPanel />
          <main id="family-tree" className="flex-1">
            <FamilyTree />
          </main>
        </div>
        <ExportToolbar />
      </div>
    </InheritanceProvider>
  );
}
