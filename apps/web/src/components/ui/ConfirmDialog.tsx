import { Sheet } from './Sheet.js';
import { useI18n } from '@/i18n/I18nProvider.js';

export function ConfirmDialog({
  open,
  title,
  message,
  danger,
  confirmLabel,
  onConfirm,
  onClose,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="mb-6 text-tg-hint">{message}</p>
      <div className="flex gap-3">
        <button className="btn-ghost flex-1" onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </button>
        <button
          className={`${danger ? 'btn-danger' : 'btn-primary'} flex-1`}
          onClick={onConfirm}
          disabled={loading}
        >
          {confirmLabel ?? t('common.confirm')}
        </button>
      </div>
    </Sheet>
  );
}
