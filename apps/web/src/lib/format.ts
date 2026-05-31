import type { ExpiryStatus, Locale } from '@inv/shared';

const localeMap: Record<Locale, string> = {
  english: 'en',
  arabic: 'ar',
  sorani: 'ckb',
  badini: 'ku',
};

export function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(localeMap[locale] ?? 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatRelativeTime(ts: number | null, locale: Locale): string {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  try {
    const rtf = new Intl.RelativeTimeFormat(localeMap[locale] ?? 'en', { numeric: 'auto' });
    if (mins < 1) return rtf.format(0, 'minute');
    if (mins < 60) return rtf.format(-mins, 'minute');
    const hours = Math.round(mins / 60);
    if (hours < 24) return rtf.format(-hours, 'hour');
    return rtf.format(-Math.round(hours / 24), 'day');
  } catch {
    return new Date(ts).toLocaleTimeString();
  }
}

export const statusColor: Record<ExpiryStatus, { bg: string; text: string; dot: string }> = {
  expired: { bg: 'bg-danger-soft', text: 'text-danger-dark', dot: 'bg-danger' },
  expiring_soon: { bg: 'bg-warn-soft', text: 'text-warn-dark', dot: 'bg-warn' },
  safe: { bg: 'bg-ok-soft', text: 'text-ok-dark', dot: 'bg-ok' },
  no_expiry: { bg: 'bg-tg-bg-secondary', text: 'text-tg-hint', dot: 'bg-tg-hint' },
};
