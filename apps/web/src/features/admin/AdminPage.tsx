import { useState } from 'react';
import { LOCALES, type AdminUserRow, type Locale } from '@inv/shared';
import {
  useAdminUsers,
  useCreateAdminUser,
  useSendTestNotification,
  useUpdateAdminUser,
} from '@/hooks/admin.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { AppShell } from '@/components/layout/AppShell.js';
import { Sheet } from '@/components/ui/Sheet.js';
import { Spinner } from '@/components/ui/Spinner.js';
import { EmptyState } from '@/components/ui/EmptyState.js';
import { useToast } from '@/components/ui/Toast.js';
import { formatDate } from '@/lib/format.js';
import { IconPlus, IconSearch } from '@/components/ui/icons.js';

export function AdminPage() {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState('');
  const [page] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);

  const { data, isLoading } = useAdminUsers({ search: search || undefined, page, pageSize: 50 });

  return (
    <AppShell
      title={t('admin.title')}
      right={
        <button className="rounded-full bg-brand-500 p-2 text-white" onClick={() => setCreateOpen(true)}>
          <IconPlus width={18} height={18} />
        </button>
      }
    >
      <div className="relative mt-2">
        <IconSearch
          width={18}
          height={18}
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-tg-hint ltr:left-3 rtl:right-3"
        />
        <input
          className="input ltr:pl-10 rtl:pr-10"
          placeholder={t('admin.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {isLoading && !data ? (
          <div className="flex justify-center py-8">
            <Spinner className="text-brand-500" />
          </div>
        ) : data && data.items.length > 0 ? (
          data.items.map((u) => (
            <button
              key={u.telegramId}
              onClick={() => setEditing(u)}
              className="card flex items-center gap-3 p-3 text-start active:scale-[0.99]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{u.shopName}</p>
                <p className="truncate text-xs text-tg-hint">
                  {u.telegramId} · {u.productCount} {t('dashboard.card.products').toLowerCase()}
                </p>
              </div>
              <span
                className={`chip ${
                  u.subscriptionStatus === 'active'
                    ? 'bg-ok-soft text-ok-dark'
                    : u.subscriptionStatus === 'disabled'
                      ? 'bg-tg-bg-secondary text-tg-hint'
                      : 'bg-danger-soft text-danger-dark'
                }`}
              >
                {u.activeUntil ? formatDate(u.activeUntil, locale) : '—'}
              </span>
            </button>
          ))
        ) : (
          <EmptyState title={t('common.empty')} />
        )}
      </div>

      <CreateUserSheet open={createOpen} onClose={() => setCreateOpen(false)} />
      {editing ? (
        <EditUserSheet user={editing} onClose={() => setEditing(null)} key={editing.telegramId} />
      ) : null}
    </AppShell>
  );
}

function CreateUserSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const create = useCreateAdminUser();
  const pushToast = useToast((s) => s.push);
  const [telegramId, setTelegramId] = useState('');
  const [shopName, setShopName] = useState('');
  const [loc, setLoc] = useState<Locale>('english');
  const [days, setDays] = useState('30');

  const submit = async () => {
    try {
      await create.mutateAsync({
        telegramId: telegramId.trim(),
        shopName: shopName.trim(),
        locale: loc,
        subscriptionDays: Number(days) || 30,
      });
      pushToast(t('admin.created'), 'success');
      onClose();
      setTelegramId('');
      setShopName('');
    } catch {
      pushToast(t('error.generic'), 'error');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('admin.addUser')}>
      <Field label={t('admin.field.telegramId')}>
        <input
          className="input"
          inputMode="numeric"
          value={telegramId}
          onChange={(e) => setTelegramId(e.target.value)}
        />
      </Field>
      <Field label={t('admin.field.shopName')}>
        <input className="input" value={shopName} onChange={(e) => setShopName(e.target.value)} />
      </Field>
      <Field label={t('settings.language.label')}>
        <select className="input" value={loc} onChange={(e) => setLoc(e.target.value as Locale)}>
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {t(`settings.language.${l}` as 'settings.language.english')}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('admin.field.days')}>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
      </Field>
      <button className="btn-primary mt-4 w-full" onClick={() => void submit()} disabled={create.isPending}>
        {t('common.save')}
      </button>
    </Sheet>
  );
}

function EditUserSheet({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const { t } = useI18n();
  const update = useUpdateAdminUser();
  const test = useSendTestNotification();
  const pushToast = useToast((s) => s.push);
  const [extend, setExtend] = useState('30');

  const doUpdate = async (input: Parameters<typeof update.mutateAsync>[0]['input']) => {
    try {
      await update.mutateAsync({ id: user.telegramId, input });
      pushToast(t('admin.updated'), 'success');
    } catch {
      pushToast(t('error.generic'), 'error');
    }
  };

  return (
    <Sheet open onClose={onClose} title={user.shopName}>
      <p className="mb-4 text-sm text-tg-hint">
        {user.telegramId} ·{' '}
        {user.activeUntil ? formatDate(user.activeUntil, t('settings.language.english') as never) : '—'}
      </p>

      <Field label={t('admin.field.days')}>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="number"
            inputMode="numeric"
            value={extend}
            onChange={(e) => setExtend(e.target.value)}
          />
          <button
            className="btn-primary"
            onClick={() => void doUpdate({ extendDays: Number(extend) || 30 })}
          >
            {t('admin.action.extend')}
          </button>
        </div>
      </Field>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {user.subscriptionStatus === 'disabled' ? (
          <button className="btn-ghost" onClick={() => void doUpdate({ disabled: false })}>
            {t('admin.action.enable')}
          </button>
        ) : (
          <button className="btn-danger" onClick={() => void doUpdate({ disabled: true })}>
            {t('admin.action.disable')}
          </button>
        )}
        <button
          className="btn-ghost"
          onClick={async () => {
            const ok = await test.mutateAsync(user.telegramId);
            pushToast(ok ? t('common.successSaved') : t('error.generic'), ok ? 'success' : 'error');
          }}
        >
          {t('notify.test.message').slice(0, 1)} {t('settings.notifications.enable')}
        </button>
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
