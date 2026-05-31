import { useEffect, type PropsWithChildren } from 'react';
import type { UserProfile } from '@inv/shared';
import { api, ApiClientError } from '@/lib/api.js';
import { useAuthStore } from '@/store/auth.js';
import { isInsideTelegram } from '@/lib/telegram.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { FullScreenLoader } from '@/components/ui/Spinner.js';
import { AccessDenied } from './AccessDenied.js';

const DEV_TG_ID = import.meta.env.VITE_DEV_TELEGRAM_ID ?? '';

/**
 * Bootstraps authentication on launch:
 *  - Outside Telegram (and no dev id) → show "open in Telegram".
 *  - Calls /auth/me which validates initData server-side.
 *  - 403 → access denied (not whitelisted / expired).
 *  - Success → store profile (drives locale + routing).
 */
export function AuthGate({ children }: PropsWithChildren) {
  const { t } = useI18n();
  const status = useAuthStore((s) => s.status);
  const setAuthed = useAuthStore((s) => s.setAuthed);
  const setDenied = useAuthStore((s) => s.setDenied);
  const setOutside = useAuthStore((s) => s.setOutside);

  useEffect(() => {
    const run = async () => {
      if (!isInsideTelegram() && !DEV_TG_ID) {
        setOutside();
        return;
      }
      try {
        const res = await api<{ profile: UserProfile }>('/auth/me');
        setAuthed(res.profile);
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 403) {
          setDenied(err.code);
        } else if (err instanceof ApiClientError && err.status === 401) {
          setDenied('invalid_initdata');
        } else {
          // Network error on first launch — show denied with retry hint.
          setDenied('network');
        }
      }
    };
    void run();
  }, [setAuthed, setDenied, setOutside]);

  if (status === 'loading') return <FullScreenLoader label={t('auth.loading')} />;
  if (status === 'outside') return <AccessDenied outside />;
  if (status === 'denied') return <AccessDenied />;
  return <>{children}</>;
}
