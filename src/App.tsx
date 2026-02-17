import { InheritanceProvider } from './context/InheritanceContext';
import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { ExportToolbar } from './components/ExportToolbar';

export default function App() {
  return (
    <InheritanceProvider>
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <LeftPanel />
          <main className="flex-1 bg-slate-100 flex items-center justify-center text-slate-400">
            <p>家族樹（待實作）</p>
          </main>
        </div>
        <ExportToolbar />
      </div>
    </InheritanceProvider>
  );
}
