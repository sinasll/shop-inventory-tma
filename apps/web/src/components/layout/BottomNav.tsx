import { NavLink } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider.js';
import { useAuthStore } from '@/store/auth.js';
import { IconBox, IconHome, IconScan, IconSettings, IconShield } from '@/components/ui/icons.js';
import { haptic } from '@/lib/telegram.js';

export function BottomNav() {
  const { t } = useI18n();
  const isAdmin = useAuthStore((s) => s.profile?.isAdmin);

  const items = [
    { to: '/', icon: IconHome, label: t('nav.dashboard'), end: true },
    { to: '/inventory', icon: IconBox, label: t('nav.inventory'), end: false },
    { to: '/scan', icon: IconScan, label: t('nav.scan'), end: false, primary: true },
    { to: '/settings', icon: IconSettings, label: t('nav.settings'), end: false },
    ...(isAdmin ? [{ to: '/admin', icon: IconShield, label: t('nav.admin'), end: false }] : []),
  ];

  return (
    <nav className="sticky bottom-0 z-30 border-t border-black/5 bg-tg-bg/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={() => haptic('light')}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition ${
                  isActive ? 'text-brand-500' : 'text-tg-hint'
                }`
              }
            >
              {({ isActive }) =>
                'primary' in it && it.primary ? (
                  <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-pop">
                    <Icon width={24} height={24} />
                  </span>
                ) : (
                  <>
                    <Icon width={22} height={22} className={isActive ? 'scale-110 transition' : ''} />
                    <span>{it.label}</span>
                  </>
                )
              }
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
