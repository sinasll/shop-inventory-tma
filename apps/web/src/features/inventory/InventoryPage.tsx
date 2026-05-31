import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { InventoryQuery } from '@inv/shared';
import { useInventory } from '@/hooks/queries.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { AppShell } from '@/components/layout/AppShell.js';
import { ProductRow } from '@/components/ProductRow.js';
import { Spinner } from '@/components/ui/Spinner.js';
import { EmptyState } from '@/components/ui/EmptyState.js';
import { IconBox, IconSearch } from '@/components/ui/icons.js';

type Filter = InventoryQuery['filter'];
type Sort = InventoryQuery['sort'];

export function InventoryPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const filter = (params.get('filter') as Filter) || 'all';
  const [sort, setSort] = useState<Sort>('urgency');
  const [page, setPage] = useState(1);

  const debounced = useDebounced(search, 300);

  const query: InventoryQuery = useMemo(
    () => ({ search: debounced || undefined, filter, sort, page, pageSize: 25 }),
    [debounced, filter, sort, page],
  );
  const { data, isLoading, isFetching } = useInventory(query);

  const setFilter = (f: Filter) => {
    setPage(1);
    const next = new URLSearchParams(params);
    next.set('filter', f);
    setParams(next, { replace: true });
  };

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: t('inventory.filter.all') },
    { id: 'expired', label: t('inventory.filter.expired') },
    { id: 'expiring_soon', label: t('inventory.filter.expiringSoon') },
    { id: 'safe', label: t('inventory.filter.safe') },
    { id: 'low_stock', label: t('inventory.filter.lowStock') },
    { id: 'favorites', label: t('inventory.filter.favorites') },
  ];

  const sorts: { id: Sort; label: string }[] = [
    { id: 'urgency', label: t('inventory.sort.urgency') },
    { id: 'name', label: t('inventory.sort.name') },
    { id: 'quantity', label: t('inventory.sort.quantity') },
    { id: 'recent', label: t('inventory.sort.recent') },
  ];

  return (
    <AppShell
      title={t('inventory.title')}
      subtitle={data ? t('inventory.count', { count: data.total }) : undefined}
    >
      <div className="sticky top-[64px] z-10 -mx-4 bg-tg-bg-secondary/90 px-4 pb-2 pt-1 backdrop-blur">
        <div className="relative">
          <IconSearch
            width={18}
            height={18}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-tg-hint ltr:left-3 rtl:right-3"
          />
          <input
            className="input ltr:pl-10 rtl:pr-10"
            placeholder={t('inventory.searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            inputMode="search"
          />
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`chip shrink-0 px-3 py-1.5 ${
                filter === f.id ? 'bg-brand-500 text-white' : 'bg-tg-bg text-tg-hint'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-1.5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="shrink-0 text-xs text-tg-hint">{t('common.sort')}:</span>
          {sorts.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSort(s.id);
                setPage(1);
              }}
              className={`shrink-0 text-xs font-semibold ${
                sort === s.id ? 'text-brand-500' : 'text-tg-hint'
              }`}
            >
              {s.label}
            </button>
          ))}
          {isFetching ? <Spinner className="ms-auto h-4 w-4 text-brand-500" /> : null}
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {isLoading && !data ? (
          <div className="flex justify-center py-10">
            <Spinner className="text-brand-500" />
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            {data.items.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
            {data.hasMore ? (
              <button className="btn-ghost mt-2" onClick={() => setPage((p) => p + 1)}>
                {t('common.next')}
              </button>
            ) : null}
          </>
        ) : (
          <EmptyState icon={<IconBox width={40} height={40} />} title={t('inventory.empty')} />
        )}
      </div>
    </AppShell>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
