import { useSyncStore } from '@/store/sync.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { formatRelativeTime } from '@/lib/format.js';

/** Shows live / offline status + last updated time. */
export function SyncBadge() {
  const { t, locale } = useI18n();
  const online = useSyncStore((s) => s.online);
  const lastUpdated = useSyncStore((s) => s.lastUpdated);

  return (
    <div
      className={`chip ${online ? 'bg-ok-soft text-ok-dark' : 'bg-warn-soft text-warn-dark'}`}
      title={lastUpdated ? t('sync.lastUpdated', { time: formatRelativeTime(lastUpdated, locale) }) : ''}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-ok' : 'bg-warn animate-pulse2'}`}
      />
      {online ? t('sync.live') : t('sync.offline')}
    </div>
  );
}
