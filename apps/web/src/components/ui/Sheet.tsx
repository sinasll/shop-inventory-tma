import { type PropsWithChildren, useEffect } from 'react';

/** Bottom sheet modal — mobile-native pattern for forms & confirmations. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: PropsWithChildren<{ open: boolean; onClose: () => void; title?: string }>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md animate-slide-up overflow-y-auto rounded-t-3xl bg-tg-bg p-5 pb-8 shadow-pop safe-bottom">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/15" />
        {title ? <h2 className="mb-4 text-lg font-bold">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
