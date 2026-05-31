import { useI18n } from '@/i18n/I18nProvider.js';
import { useAuthStore } from '@/store/auth.js';
import { openContact } from '@/lib/telegram.js';
import { IconShield } from '@/components/ui/icons.js';

const CONTACT = import.meta.env.VITE_CONTACT_ADMIN_URL ?? 'https://t.me';

export function AccessDenied({ outside }: { outside?: boolean }) {
  const { t } = useI18n();
  const reason = useAuthStore((s) => s.deniedReason);

  const message = outside
    ? t('auth.outsideTelegram')
    : reason === 'subscription_expired'
      ? t('auth.denied.expired')
      : t('auth.denied.notWhitelisted');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-tg-bg-secondary px-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-danger-soft text-danger">
        <IconShield width={40} height={40} />
      </div>
      <h1 className="text-2xl font-extrabold">{t('auth.denied.title')}</h1>
      <p className="max-w-sm text-tg-hint">{message}</p>
      {!outside ? (
        <button className="btn-primary" onClick={() => openContact(CONTACT)}>
          {t('auth.denied.contact')}
        </button>
      ) : null}
    </div>
  );
}
