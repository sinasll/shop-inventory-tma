import { Link } from 'react-router-dom';
import type { DashboardStats } from '@inv/shared';
import { useDashboard } from '@/hooks/queries.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { useAuthStore } from '@/store/auth.js';
import { AppShell } from '@/components/layout/AppShell.js';
import { ProductRow } from '@/components/ProductRow.js';
import { FullScreenLoader } from '@/components/ui/Spinner.js';
import { EmptyState } from '@/components/ui/EmptyState.js';
import { IconBox, IconCheck } from '@/components/ui/icons.js';

export function DashboardPage() {
  const { t } = useI18n();
  const shopName = useAuthStore((s) => s.profile?.shopName);
  const { data, isLoading } = useDashboard();

  return (
    <AppShell title={shopName ?? t('dashboard.title')} subtitle={t('dashboard.subtitle')}>
      {isLoading && !data ? (
        <FullScreenLoader label={t('common.loading')} />
      ) : data ? (
        <>
          <StatStrip stats={data.stats} />

          <SectionHeader title={t('dashboard.critical.title')} />
          {data.critical.length === 0 ? (
            <div className="card p-6">
              <EmptyState
                icon={<IconCheck width={40} height={40} className="text-ok" />}
                title={t('dashboard.critical.empty')}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {data.critical.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </div>
          )}

          {data.recentlyScanned.length > 0 ? (
            <>
              <SectionHeader
                title={t('dashboard.recent.title')}
                action={
                  <Link to="/inventory" className="text-sm font-semibold text-brand-500">
                    {t('dashboard.viewAll')}
                  </Link>
                }
              />
              <div className="flex flex-col gap-2">
                {data.recentlyScanned.map((p) => (
                  <ProductRow key={p.id} product={p} />
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <EmptyState icon={<IconBox width={40} height={40} />} title={t('common.error')} />
      )}
    </AppShell>
  );
}

function StatStrip({ stats }: { stats: DashboardStats }) {
  const { t } = useI18n();
  const cards = [
    {
      label: t('dashboard.card.expired'),
      value: stats.expiredCount,
      cls: 'bg-danger-soft text-danger-dark',
      to: '/inventory?filter=expired',
    },
    {
      label: t('dashboard.card.expiringSoon'),
      value: stats.expiringSoonCount,
      cls: 'bg-warn-soft text-warn-dark',
      to: '/inventory?filter=expiring_soon',
    },
    {
      label: t('dashboard.card.safe'),
      value: stats.safeCount,
      cls: 'bg-ok-soft text-ok-dark',
      to: '/inventory?filter=safe',
    },
    {
      label: t('dashboard.card.lowStock'),
      value: stats.lowStockCount,
      cls: 'bg-brand-50 text-brand-700',
      to: '/inventory?filter=low_stock',
    },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 pt-2">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className={`card p-4 ${c.cls} active:scale-[0.98]`}>
            <p className="text-3xl font-extrabold leading-none">{c.value}</p>
            <p className="mt-1 text-sm font-medium">{c.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        <MiniStat label={t('dashboard.card.products')} value={stats.totalProducts} />
        <MiniStat label={t('dashboard.card.units')} value={stats.totalUnits} />
        {stats.estimatedStockValue != null ? (
          <MiniStat label={t('dashboard.card.value')} value={stats.estimatedStockValue} />
        ) : null}
      </div>
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card min-w-[110px] shrink-0 px-4 py-3">
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-xs text-tg-hint">{label}</p>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between">
      <h2 className="text-base font-bold">{title}</h2>
      {action}
    </div>
  );
}
