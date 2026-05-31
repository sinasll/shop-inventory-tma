import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductDetail } from '@inv/shared';
import { lookupBarcode } from '@/hooks/queries.js';
import { useI18n } from '@/i18n/I18nProvider.js';
import { useAuthStore } from '@/store/auth.js';
import { AppShell } from '@/components/layout/AppShell.js';
import { Spinner } from '@/components/ui/Spinner.js';
import { useToast } from '@/components/ui/Toast.js';
import { haptic } from '@/lib/telegram.js';
import { useScanner } from './useScanner.js';
import { FastEntrySheet } from './FastEntrySheet.js';

/**
 * Fast-entry scanning flow:
 *  1. Camera scans a barcode.
 *  2. We look it up. Existing → open add-stock sheet. New → open create sheet.
 *  3. After saving, the sheet closes and the scanner re-arms automatically
 *     for the next product (no navigation needed).
 */
export function ScannerPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const settings = useAuthStore((s) => s.profile?.settings);
  const pushToast = useToast((s) => s.push);

  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [manual, setManual] = useState('');
  const [scanResult, setScanResult] = useState<{
    barcode: string;
    product: ProductDetail | null;
  } | null>(null);
  const lockRef = useRef(false);

  const handleDetected = useCallback(
    async (barcode: string) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setBusy(true);
      try {
        if (settings?.scannerVibration) haptic('success');
        if (settings?.scannerSound) beep();
        const res = await lookupBarcode(barcode.trim());
        setScanResult({ barcode: barcode.trim(), product: res.product });
        setSheetOpen(true);
      } catch {
        pushToast(t('error.network'), 'error');
        lockRef.current = false;
      } finally {
        setBusy(false);
      }
    },
    [settings, pushToast, t],
  );

  const { status, cameras, switchCamera } = useScanner({
    elementId: 'qr-reader',
    preferRear: settings?.preferRearCamera ?? true,
    onDetected: handleDetected,
    enabled: !sheetOpen,
  });

  const closeAndRearm = () => {
    setSheetOpen(false);
    setScanResult(null);
    // small delay before re-enabling detection to avoid instant re-read
    setTimeout(() => {
      lockRef.current = false;
    }, 600);
  };

  return (
    <AppShell title={t('scanner.title')} subtitle={t('scanner.hint')}>
      <div className="card relative mt-2 overflow-hidden">
        <div id="qr-reader" className="aspect-[3/4] w-full bg-black" />
        {/* Scan overlay frame */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-64 rounded-2xl border-2 border-white/80 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
        </div>

        {(status === 'starting' || busy) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
            <Spinner />
            <p className="text-sm">{busy ? t('common.loading') : t('scanner.starting')}</p>
          </div>
        )}

        {status === 'denied' && (
          <Overlay text={t('scanner.permissionDenied')} />
        )}
        {status === 'no-camera' && <Overlay text={t('scanner.noCamera')} />}

        {cameras.length > 1 && status === 'scanning' ? (
          <button
            onClick={() => void switchCamera()}
            className="absolute bottom-3 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-tg-text shadow-pop ltr:right-3 rtl:left-3"
          >
            {t('scanner.switchCamera')}
          </button>
        ) : null}
      </div>

      {/* Manual entry fallback (weak camera / damaged barcode). */}
      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-tg-hint">{t('scanner.manualEntry')}</p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder={t('scanner.manualPlaceholder')}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
          />
          <button
            className="btn-primary"
            disabled={!manual.trim() || busy}
            onClick={() => {
              lockRef.current = false;
              void handleDetected(manual.trim());
              setManual('');
            }}
          >
            {t('common.search')}
          </button>
        </div>
      </div>

      {scanResult ? (
        <FastEntrySheet
          open={sheetOpen}
          barcode={scanResult.barcode}
          existing={scanResult.product}
          onClose={closeAndRearm}
          onOpenProduct={(id) => {
            closeAndRearm();
            navigate(`/product/${id}`);
          }}
        />
      ) : null}
    </AppShell>
  );
}

function Overlay({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-6 text-center text-sm text-white">
      {text}
    </div>
  );
}

/** Short WebAudio beep — no asset download required. */
function beep() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
    setTimeout(() => void ctx.close(), 300);
  } catch {
    /* audio not allowed — ignore */
  }
}
