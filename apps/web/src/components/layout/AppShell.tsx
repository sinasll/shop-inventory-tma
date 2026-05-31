import type { PropsWithChildren, ReactNode } from 'react';
import { SyncBadge } from './SyncBadge.js';
import { BottomNav } from './BottomNav.js';

export function AppShell({
  title,
  subtitle,
  right,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string; right?: ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-tg-bg-secondary">
      <header className="sticky top-0 z-20 bg-tg-bg-secondary/90 px-4 pb-2 pt-3 backdrop-blur safe-top">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold">{title}</h1>
            {subtitle ? <p className="truncate text-sm text-tg-hint">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {right}
            <SyncBadge />
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 pb-6">{children}</main>
      <BottomNav />
    </div>
  );
}
