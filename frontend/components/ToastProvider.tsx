import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (t: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const next: Toast = { id, ...t };
    setToasts((prev) => [...prev, next]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[9999] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className={
              t.type === 'success'
                ? 'rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 backdrop-blur-xl shadow-soft'
                : t.type === 'error'
                  ? 'rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 backdrop-blur-xl shadow-soft'
                  : 'rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-xl shadow-soft'
            }
          >
            <div className="text-sm font-semibold text-white">{t.title}</div>
            {t.message ? <div className="mt-1 text-sm text-white/70">{t.message}</div> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
