import { create } from 'zustand';
import { useEffect } from 'react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}
interface ToastState {
  toasts: ToastItem[];
  push: (message: string, kind?: ToastKind) => void;
  remove: (id: number) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (message, kind = 'info') =>
    set((s) => ({ toasts: [...s.toasts, { id: Date.now() + Math.random(), message, kind }] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function ToastHost() {
  const { toasts, remove } = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 safe-top">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDone={() => remove(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDone }: { toast: ToastItem; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2600);
    return () => clearTimeout(timer);
  }, [onDone]);
  const color =
    toast.kind === 'success'
      ? 'bg-ok text-white'
      : toast.kind === 'error'
        ? 'bg-danger text-white'
        : 'bg-tg-text text-tg-bg';
  return (
    <div
      className={`pointer-events-auto w-full max-w-sm animate-fade-in rounded-xl px-4 py-3 text-sm font-medium shadow-pop ${color}`}
    >
      {toast.message}
    </div>
  );
}
