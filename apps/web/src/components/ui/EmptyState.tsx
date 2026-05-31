import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon ? <div className="text-tg-hint opacity-60">{icon}</div> : null}
      <p className="font-semibold">{title}</p>
      {hint ? <p className="max-w-xs text-sm text-tg-hint">{hint}</p> : null}
      {action}
    </div>
  );
}
