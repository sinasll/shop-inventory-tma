import type { ExpiryStatus } from '@inv/shared';
import { statusColor } from '@/lib/format.js';
import { useI18n } from '@/i18n/I18nProvider.js';

const keyMap: Record<ExpiryStatus, 'status.expired' | 'status.expiring_soon' | 'status.safe' | 'status.no_expiry'> =
  {
    expired: 'status.expired',
    expiring_soon: 'status.expiring_soon',
    safe: 'status.safe',
    no_expiry: 'status.no_expiry',
  };

export function StatusBadge({ status }: { status: ExpiryStatus }) {
  const { t } = useI18n();
  const c = statusColor[status];
  return (
    <span className={`chip ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {t(keyMap[status])}
    </span>
  );
}
