import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { BatchMovementType } from '@inv/shared';
import {
  useAddBatch,
  useDeleteProduct,
  useMovement,
  useProduct,
  useUpdateProduct,
} from '@/hooks/queries.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { useAuthStore } from '@/store/auth.js';
import { AppShell } from '@/components/layout/AppShell.js';
import { FullScreenLoader } from '@/components/ui/Spinner.js';
import { StatusBadge } from '@/components/ui/StatusBadge.js';
import { Sheet } from '@/components/ui/Sheet.js';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog.js';
import { EmptyState } from '@/components/ui/EmptyState.js';
import { useToast } from '@/components/ui/Toast.js';
import { IconPlus, IconStar, IconTrash } from '@/components/ui/icons.js';
import { formatDate, statusColor } from '@/lib/format.js';
import { addBatchSchema } from '@inv/shared';

const ACTIONS: { type: BatchMovementType; key: string }[] = [
  { type: 'sold', key: 'product.action.sold' },
  { type: 'discarded', key: 'product.action.discarded' },
  { type: 'damaged', key: 'product.action.damaged' },
  { type: 'returned', key: 'product.action.returned' },
  { type: 'removed', key: 'product.action.removed' },
];

export function ProductPage() {
  const { t, locale } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lowStock = useAuthStore((s) => s.profile?.settings.lowStockThreshold ?? 5);
  const pushToast = useToast((s) => s.push);

  const { data, isLoading } = useProduct(id);
  const update = useUpdateProduct(id!);
  const addBatch = useAddBatch(id!);
  const movement = useMovement(id!);
  const del = useDeleteProduct();

  const [addOpen, setAddOpen] = useState(false);
  const [actionFor, setActionFor] = useState<{ type: BatchMovementType } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [qty, setQty] = useState('1');
  const [expiry, setExpiry] = useState('');
  const [actionQty, setActionQty] = useState('1');

  if (isLoading || !data) return <FullScreenLoader label={t('common.loading')} />;
  const p = data.product;
  const isLow = p.totalQuantity > 0 && p.totalQuantity <= lowStock;

  const submitBatch = async () => {
    const parsed = addBatchSchema.safeParse({
      quantity: Number(qty),
      expiryDate: expiry ? new Date(expiry).toISOString() : null,
    });
    if (!parsed.success) return pushToast(t('error.validation'), 'error');
    await addBatch.mutateAsync(parsed.data);
    pushToast(t('product.batch.added'), 'success');
    setAddOpen(false);
    setQty('1');
    setExpiry('');
  };

  const submitMovement = async () => {
    if (!actionFor) return;
    const n = Number(actionQty);
    if (!Number.isInteger(n) || n <= 0 || n > p.totalQuantity)
      return pushToast(t('error.validation'), 'error');
    await movement.mutateAsync({ type: actionFor.type, quantity: n });
    pushToast(t('common.successSaved'), 'success');
    setActionFor(null);
    setActionQty('1');
  };

  return (
    <AppShell
      title={p.name}
      subtitle={p.barcode}
      right={
        <button
          onClick={() => update.mutate({ isFavorite: !p.isFavorite })}
          className="rounded-full p-1.5"
          aria-label={t('product.favorite')}
        >
          <IconStar
            width={22}
            height={22}
            className={p.isFavorite ? 'text-warn' : 'text-tg-hint'}
            fill={p.isFavorite ? 'currentColor' : 'none'}
          />
        </button>
      }
    >
      {/* Summary card */}
      <div className="card mt-2 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-tg-hint">{t('product.totalStock')}</p>
            <p className="text-4xl font-extrabold leading-none">{p.totalQuantity}</p>
            <p className="text-xs text-tg-hint">{t('common.units')}</p>
          </div>
          <StatusBadge status={p.expiryStatus} />
        </div>
        {isLow ? (
          <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
            {t('inventory.filter.lowStock')}
          </p>
        ) : null}
      </div>

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="btn-primary" onClick={() => setAddOpen(true)}>
          <IconPlus width={18} height={18} /> {t('product.addBatch')}
        </button>
        <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
          <IconTrash width={18} height={18} /> {t('common.delete')}
        </button>
      </div>

      {/* Mark as ... */}
      <p className="mb-2 mt-5 text-base font-bold">{t('product.markAs')}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {ACTIONS.map((a) => (
          <button
            key={a.type}
            disabled={p.totalQuantity === 0}
            onClick={() => {
              setActionFor({ type: a.type });
              setActionQty('1');
            }}
            className="chip shrink-0 bg-tg-bg px-3 py-2 text-tg-text shadow-card disabled:opacity-40"
          >
            {t(a.key as 'product.action.sold')}
          </button>
        ))}
      </div>

      {/* Grouped batches */}
      <p className="mb-2 mt-5 text-base font-bold">{t('product.batches')}</p>
      {p.groupedBatches.length === 0 ? (
        <div className="card p-4">
          <EmptyState title={t('product.noBatches')} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {p.groupedBatches.map((g) => {
            const c = statusColor[g.expiryStatus];
            return (
              <div key={g.batchIds.join('-')} className="card flex items-center gap-3 p-3">
                <span className={`h-9 w-1.5 rounded-full ${c.dot}`} />
                <div className="flex-1">
                  <p className="font-semibold">
                    {g.expiryDate
                      ? t('product.batch.expiryGroup', { date: formatDate(g.expiryDate, locale) })
                      : t('product.batch.noExpiry')}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={g.expiryStatus} />
                  </div>
                </div>
                <div className="text-end">
                  <p className="text-lg font-bold leading-none">{g.quantity}</p>
                  <p className="text-[10px] uppercase text-tg-hint">{t('common.units')}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add batch sheet */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={t('product.addBatch')}>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t('common.quantity')}</span>
            <input
              className="input"
              type="number"
              min={1}
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t('common.expiryDate')}</span>
            <input
              className="input"
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
        </div>
        <button
          className="btn-primary mt-5 w-full"
          onClick={() => void submitBatch()}
          disabled={addBatch.isPending}
        >
          {t('common.save')}
        </button>
      </Sheet>

      {/* Movement sheet */}
      <Sheet
        open={!!actionFor}
        onClose={() => setActionFor(null)}
        title={actionFor ? t(`product.action.${actionFor.type}` as 'product.action.sold') : ''}
      >
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t('common.quantity')}</span>
          <input
            className="input"
            type="number"
            min={1}
            max={p.totalQuantity}
            inputMode="numeric"
            value={actionQty}
            onChange={(e) => setActionQty(e.target.value)}
          />
        </label>
        <p className="mt-2 text-xs text-tg-hint">
          {t('product.totalStock')}: {p.totalQuantity}
        </p>
        <button
          className="btn-primary mt-5 w-full"
          onClick={() => void submitMovement()}
          disabled={movement.isPending}
        >
          {t('common.confirm')}
        </button>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        danger
        title={t('product.confirm.title')}
        message={t('product.confirm.delete')}
        confirmLabel={t('common.delete')}
        loading={del.isPending}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await del.mutateAsync(p.id);
          pushToast(t('common.successSaved'), 'success');
          navigate('/inventory', { replace: true });
        }}
      />
    </AppShell>
  );
}
