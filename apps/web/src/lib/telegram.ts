/**
 * Thin, defensive bridge over the Telegram WebApp runtime.
 *
 * We read directly from `window.Telegram.WebApp` (injected by
 * telegram-web-app.js) instead of coupling to a specific SDK version.
 * Everything degrades gracefully when opened outside Telegram (dev mode),
 * so the app never crashes in a normal browser.
 */

interface TgWebApp {
  initData: string;
  initDataUnsafe?: { user?: { id: number; username?: string; language_code?: string } };
  colorScheme?: 'light' | 'dark';
  themeParams?: Record<string, string>;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export function getWebApp(): TgWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function isInsideTelegram(): boolean {
  const wa = getWebApp();
  return !!wa && typeof wa.initData === 'string' && wa.initData.length > 0;
}

/** Raw, signed initData string to send to the backend for verification. */
export function getInitData(): string {
  return getWebApp()?.initData ?? '';
}

export function getInitDataUserId(): string | null {
  const id = getWebApp()?.initDataUnsafe?.user?.id;
  return id ? String(id) : null;
}

/** Apply Telegram theme params to our CSS variables for native look. */
export function applyTelegramTheme(): void {
  const wa = getWebApp();
  if (!wa) return;
  const p = wa.themeParams ?? {};
  const root = document.documentElement.style;
  const map: Record<string, string | undefined> = {
    '--tg-bg': p.bg_color,
    '--tg-secondary-bg': p.secondary_bg_color,
    '--tg-text': p.text_color,
    '--tg-hint': p.hint_color,
    '--tg-link': p.link_color,
    '--tg-button': p.button_color,
    '--tg-button-text': p.button_text_color,
  };
  for (const [key, value] of Object.entries(map)) {
    if (value) root.setProperty(key, value);
  }
}

export function initTelegram(): void {
  const wa = getWebApp();
  if (!wa) return;
  try {
    wa.ready();
    wa.expand();
    applyTelegramTheme();
    wa.enableClosingConfirmation?.();
    if (wa.themeParams?.bg_color) wa.setBackgroundColor?.(wa.themeParams.bg_color);
  } catch {
    /* ignore — non-fatal */
  }
}

export function haptic(type: 'success' | 'warning' | 'error' | 'light' = 'light'): void {
  const h = getWebApp()?.HapticFeedback;
  if (!h) return;
  try {
    if (type === 'light') h.impactOccurred('light');
    else h.notificationOccurred(type);
  } catch {
    /* ignore */
  }
}

export function openContact(url: string): void {
  const wa = getWebApp();
  if (wa?.openTelegramLink && url.includes('t.me')) wa.openTelegramLink(url);
  else if (wa?.openLink) wa.openLink(url);
  else window.open(url, '_blank');
}
