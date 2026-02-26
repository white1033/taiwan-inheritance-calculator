import { createContext, useState, useCallback, useRef } from 'react';

type ToastType = 'info' | 'error' | 'success';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext<ToastContextType | null>(null);

let nextToastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextToastId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    const duration = type === 'error' ? 8000 : 3000;
    const timer = setTimeout(() => {
      timersRef.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
    timersRef.current.set(id, timer);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`px-4 py-3 rounded-md shadow-md text-sm pointer-events-auto ${
              t.type === 'error'
                ? 'bg-red-50 text-red-800 border border-red-200'
                : t.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-white text-slate-800 border border-slate-200'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
