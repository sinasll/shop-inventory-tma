import { Link } from 'react-router-dom';
import type { ProductSummary } from '@inv/shared';
import { useI18n } from '@/i18n/I18nProvider.js';
import { statusColor } from '@/lib/format.js';
import { IconChevron, IconStar } from '@/components/ui/icons.js';
import { StatusBadge } from '@/components/ui/StatusBadge.js';
import { daysToExpiry } from '@inv/shared';

export function ProductRow({ product }: { product: ProductSummary }) {
  const { t } = useI18n();
  const c = statusColor[product.expiryStatus];
  const dte = daysToExpiry(product.earliestExpiry);

  let expiryText = '';
  if (product.expiryStatus === 'expired' && dte != null)
    expiryText = t('status.expiredAgo', { days: Math.abs(dte) });
  else if (dte === 0) expiryText = t('status.expiresToday');
  else if (product.expiryStatus === 'expiring_soon' && dte != null)
    expiryText = t('status.expiresIn', { days: dte });

  return (
    <Link
      to={`/product/${product.id}`}
      className="card flex items-center gap-3 p-3 active:scale-[0.99]"
    >
      <div className={`h-11 w-1.5 shrink-0 rounded-full ${c.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {product.isFavorite ? (
            <IconStar width={14} height={14} className="text-warn" fill="currentColor" />
          ) : null}
          <p className="truncate font-semibold">{product.name}</p>
        </div>
        <p className="truncate text-xs text-tg-hint">{product.barcode}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusBadge status={product.expiryStatus} />
          {expiryText ? <span className="text-xs text-tg-hint">{expiryText}</span> : null}
        </div>
      </div>
      <div className="text-end">
        <p className="text-lg font-bold leading-none">{product.totalQuantity}</p>
        <p className="text-[10px] uppercase tracking-wide text-tg-hint">{t('common.units')}</p>
      </div>
      <IconChevron width={18} height={18} className="text-tg-hint rtl:rotate-180" />
    </Link>
  );
}
