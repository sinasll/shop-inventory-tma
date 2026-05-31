import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App.js';
import { I18nProvider } from './i18n/I18nProvider.js';
import { ToastHost } from './components/ui/Toast.js';
import { initTelegram } from './lib/telegram.js';
import { useSyncStore } from './store/sync.js';
import './index.css';

// Initialise the Telegram WebApp runtime (theme, expand, ready).
initTelegram();

// Reflect browser online/offline transitions into the sync badge.
window.addEventListener('online', () => useSyncStore.getState().setOnline(true));
window.addEventListener('offline', () => useSyncStore.getState().setOnline(false));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 30,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ToastHost />
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
