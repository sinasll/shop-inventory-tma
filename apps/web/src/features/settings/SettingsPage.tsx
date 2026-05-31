import { useQueryClient } from '@tanstack/react-query';
import { LOCALES, type UpdateSettingsInput } from '@inv/shared';
import { useUpdateSettings } from '@/hooks/queries.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { useAuthStore } from '@/store/auth.js';
import { AppShell } from '@/components/layout/AppShell.js';
import { Toggle } from '@/components/ui/Toggle.js';
import { useToast } from '@/components/ui/Toast.js';
import { cacheClear } from '@/lib/cache.js';
import { openContact } from '@/lib/telegram.js';
import { formatDate } from '@/lib/format.js';
import { IconCloud, IconRefresh } from '@/components/ui/icons.js';

const CONTACT = import.meta.env.VITE_CONTACT_ADMIN_URL ?? 'https://t.me';
const APP_VERSION = '1.0.0';

export function SettingsPage() {
  const { t, locale } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const update = useUpdateSettings();
  const pushToast = useToast((s) => s.push);
  const qc = useQueryClient();

  if (!profile) return null;
  const s = profile.settings;

  const patch = (input: UpdateSettingsInput) => {
    update.mutate(input, {
      onSuccess: () => pushToast(t('common.successSaved'), 'success'),
      onError: () => pushToast(t('error.generic'), 'error'),
    });
  };

  const subStatusKey =
    profile.subscription.status === 'active'
      ? 'settings.account.status.active'
      : profile.subscription.status === 'disabled'
        ? 'settings.account.status.disabled'
        : 'settings.account.status.expired';

  return (
    <AppShell title={t('settings.title')}>
      {/* Language */}
      <Section title={t('settings.section.language')}>
        <div className="grid grid-cols-2 gap-2">
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => l !== locale && patch({ locale: l })}
              className={`btn ${
                l === locale ? 'bg-brand-500 text-white' : 'bg-tg-bg-secondary text-tg-text'
              }`}
            >
              {t(`settings.language.${l}` as 'settings.language.english')}
            </button>
          ))}
        </div>
      </Section>

      {/* Notifications */}
      <Section title={t('settings.section.notifications')}>
        <Row label={t('settings.notifications.enable')}>
          <Toggle
            checked={s.notificationsEnabled}
            onChange={(v) => patch({ notificationsEnabled: v })}
          />
        </Row>
        <Row label={t('settings.notifications.expiry')}>
          <Toggle
            checked={s.expiryAlertsEnabled}
            onChange={(v) => patch({ expiryAlertsEnabled: v })}
          />
        </Row>
        <Row label={t('settings.notifications.lowStock')}>
          <Toggle
            checked={s.lowStockAlertsEnabled}
            onChange={(v) => patch({ lowStockAlertsEnabled: v })}
          />
        </Row>
        <Row label={t('settings.notifications.time')}>
          <input
            className="input w-32"
            type="time"
            value={s.dailyAlertTime}
            onChange={(e) => patch({ dailyAlertTime: e.target.value })}
          />
        </Row>
        <Row label={t('settings.notifications.warningDays')}>
          <Stepper
            value={s.expiryWarningDays}
            min={1}
            max={90}
            suffix={t('settings.notifications.warningDaysValue', { days: s.expiryWarningDays })}
            onChange={(v) => patch({ expiryWarningDays: v })}
          />
        </Row>
        <Row label={t('settings.notifications.lowStockThreshold')}>
          <Stepper
            value={s.lowStockThreshold}
            min={0}
            max={100}
            onChange={(v) => patch({ lowStockThreshold: v })}
          />
        </Row>
      </Section>

      {/* Scanner */}
      <Section title={t('settings.section.scanner')}>
        <Row label={t('settings.scanner.sound')}>
          <Toggle checked={s.scannerSound} onChange={(v) => patch({ scannerSound: v })} />
        </Row>
        <Row label={t('settings.scanner.vibration')}>
          <Toggle checked={s.scannerVibration} onChange={(v) => patch({ scannerVibration: v })} />
        </Row>
        <Row label={t('settings.scanner.rearCamera')}>
          <Toggle checked={s.preferRearCamera} onChange={(v) => patch({ preferRearCamera: v })} />
        </Row>
      </Section>

      {/* Offline & data */}
      <Section title={t('settings.section.offline')}>
        <Row label={t('settings.offline.enable')}>
          <Toggle
            checked={s.offlineCacheEnabled}
            onChange={(v) => patch({ offlineCacheEnabled: v })}
          />
        </Row>
        <button
          className="btn-ghost mt-1 w-full justify-start"
          onClick={() => {
            void qc.invalidateQueries();
            pushToast(t('sync.syncing'), 'info');
          }}
        >
          <IconRefresh width={18} height={18} /> {t('settings.offline.refresh')}
        </button>
        <button
          className="btn-ghost mt-2 w-full justify-start"
          onClick={() => {
            cacheClear();
            pushToast(t('settings.offline.cleared'), 'success');
          }}
        >
          <IconCloud width={18} height={18} /> {t('settings.offline.clear')}
        </button>
      </Section>

      {/* Account */}
      <Section title={t('settings.section.account')}>
        <Info label={t('settings.account.shop')} value={profile.shopName} />
        <Info label={t('settings.account.telegramId')} value={profile.telegramId} />
        <Info label={t('settings.account.subscription')} value={t(subStatusKey)} />
        <Info
          label={t('settings.account.activeUntil')}
          value={formatDate(profile.subscription.activeUntil, locale)}
        />
      </Section>

      {/* Help */}
      <Section title={t('settings.section.help')}>
        <button
          className="btn-ghost w-full justify-start"
          onClick={() => openContact(CONTACT)}
        >
          {t('settings.help.contact')}
        </button>
        <Info label={t('settings.help.version')} value={APP_VERSION} />
      </Section>

      <p className="py-6 text-center text-xs text-tg-hint">{t('app.name')} · {t('app.tagline')}</p>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-tg-hint">{title}</h2>
      <div className="card flex flex-col gap-1 p-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-3 py-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-tg-hint">{label}</span>
      <span className="truncate text-sm font-semibold">{value}</span>
    </div>
  );
}

function Stepper({
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {suffix ? <span className="text-xs text-tg-hint">{suffix}</span> : null}
      <button
        className="h-8 w-8 rounded-lg bg-tg-bg-secondary font-bold"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span className="w-6 text-center font-bold">{value}</span>
      <button
        className="h-8 w-8 rounded-lg bg-tg-bg-secondary font-bold"
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}
