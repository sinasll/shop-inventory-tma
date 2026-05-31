import { useState } from 'react';
import type { ProductDetail } from '@inv/shared';
import { addBatchSchema, createProductSchema } from '@inv/shared';
import { useAddBatch, useCreateProduct } from '@/hooks/queries.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { Sheet } from '@/components/ui/Sheet.js';
import { useToast } from '@/components/ui/Toast.js';
import { Spinner } from '@/components/ui/Spinner.js';
import { IconCheck } from '@/components/ui/icons.js';

export function FastEntrySheet({
  open,
  barcode,
  existing,
  onClose,
  onOpenProduct,
}: {
  open: boolean;
  barcode: string;
  existing: ProductDetail | null;
  onClose: () => void;
  onOpenProduct: (id: string) => void;
}) {
  const { t } = useI18n();
  const pushToast = useToast((s) => s.push);
  const createProduct = useCreateProduct();
  // Hooks must be unconditional — create a placeholder id when new.
  const targetId = existing?.id ?? '__new__';
  const addBatch = useAddBatch(targetId);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [expiry, setExpiry] = useState('');
  const busy = createProduct.isPending || addBatch.isPending;

  const reset = () => {
    setName('');
    setQuantity('1');
    setExpiry('');
  };

  const submit = async () => {
    const qty = Number(quantity);
    const batch = addBatchSchema.safeParse({
      quantity: qty,
      expiryDate: expiry ? new Date(expiry).toISOString() : null,
    });
    if (!batch.success) {
      pushToast(t('error.validation'), 'error');
      return;
    }

    try {
      if (existing) {
        await addBatch.mutateAsync(batch.data);
        pushToast(t('product.batch.added'), 'success');
      } else {
        const product = createProductSchema.safeParse({ barcode, name: name.trim() });
        if (!product.success) {
          pushToast(t('error.validation'), 'error');
          return;
        }
        const created = await createProduct.mutateAsync(product.data);
        // Add the first batch to the newly created product.
        await addBatchInline(created.product.id, batch.data);
        pushToast(t('product.create.success'), 'success');
      }
      reset();
      onClose(); // re-arms the scanner
    } catch {
      pushToast(t('error.generic'), 'error');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={existing ? t('scanner.found') : t('scanner.new')}>
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-tg-bg-secondary p-3">
        <span className="chip bg-brand-50 text-brand-700">
          <IconCheck width={14} height={14} /> {barcode}
        </span>
        {existing ? (
          <span className="truncate text-sm font-semibold">{existing.name}</span>
        ) : null}
      </div>

      {!existing ? (
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-semibold">{t('product.name')}</span>
          <input
            className="input"
            placeholder={t('product.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{t('common.quantity')}</span>
          <input
            className="input"
            type="number"
            min={1}
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">
            {t('common.expiryDate')} <span className="text-tg-hint">({t('common.optional')})</span>
          </span>
          <input
            className="input"
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-5 flex gap-3">
        {existing ? (
          <button className="btn-ghost flex-1" onClick={() => onOpenProduct(existing.id)}>
            {t('product.title')}
          </button>
        ) : null}
        <button className="btn-primary flex-1" onClick={() => void submit()} disabled={busy}>
          {busy ? <Spinner className="h-5 w-5" /> : t('common.save')}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-tg-hint">{t('scanner.continuous')} ↻</p>
    </Sheet>
  );
}

// Helper that adds a batch by product id outside the React Query hook
// (used right after creating a new product).
import { api } from '@/lib/api.js';
import type { AddBatchInput } from '@inv/shared';
async function addBatchInline(productId: string, input: AddBatchInput) {
  await api(`/products/${productId}/batches`, { method: 'POST', body: input });
}
