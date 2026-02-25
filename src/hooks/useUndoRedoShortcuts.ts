import { useEffect } from 'react';
import { useInheritance } from './useInheritance';

export function useUndoRedoShortcuts() {
  const { dispatch } = useInheritance();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const nav = navigator as Navigator & { userAgentData?: { platform: string } };
      const isMac = nav.userAgentData
        ? nav.userAgentData.platform === 'macOS'
        : /Mac|iPhone|iPad/.test(navigator.userAgent);
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);
}
