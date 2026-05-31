import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, type CameraDevice } from 'html5-qrcode';

type ScanStatus = 'idle' | 'starting' | 'scanning' | 'denied' | 'no-camera' | 'error';

interface UseScannerOptions {
  elementId: string;
  preferRear: boolean;
  onDetected: (barcode: string) => void;
  enabled: boolean;
}

/**
 * Robust html5-qrcode wrapper:
 *  - auto-selects the rear camera when available
 *  - debounces duplicate reads of the same code
 *  - exposes start/stop and camera switching
 *  - cleans up fully on unmount (releases the camera stream)
 */
export function useScanner({ elementId, preferRear, onDetected, enabled }: UseScannerOptions) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const lastCodeRef = useRef<{ code: string; ts: number }>({ code: '', ts: 0 });
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const pickCamera = (devices: CameraDevice[]): string | null => {
    if (devices.length === 0) return null;
    if (!preferRear) return devices[0]!.id;
    const rear = devices.find((d) => /back|rear|environment/i.test(d.label));
    return (rear ?? devices[devices.length - 1] ?? devices[0])!.id;
  };

  const start = async (cameraId?: string) => {
    if (!enabled) return;
    try {
      setStatus('starting');
      if (!scannerRef.current) scannerRef.current = new Html5Qrcode(elementId, { verbose: false });

      let devices = cameras;
      if (devices.length === 0) {
        devices = await Html5Qrcode.getCameras();
        setCameras(devices);
      }
      if (devices.length === 0) {
        setStatus('no-camera');
        return;
      }
      const id = cameraId ?? pickCamera(devices);
      if (!id) {
        setStatus('no-camera');
        return;
      }
      setActiveCameraId(id);

      await scannerRef.current.start(
        id,
        { fps: 10, qrbox: { width: 250, height: 160 }, aspectRatio: 1.4 },
        (decoded) => {
          const now = Date.now();
          // Ignore the same barcode within 2.5s to prevent double-fires.
          if (lastCodeRef.current.code === decoded && now - lastCodeRef.current.ts < 2500) return;
          lastCodeRef.current = { code: decoded, ts: now };
          onDetectedRef.current(decoded);
        },
        () => {
          /* per-frame decode failures are normal; ignore */
        },
      );
      setStatus('scanning');
    } catch (err) {
      const message = String((err as Error)?.message ?? err);
      if (/permission|denied|NotAllowed/i.test(message)) setStatus('denied');
      else setStatus('error');
    }
  };

  const stop = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      await s.clear();
    } catch {
      /* ignore */
    }
  };

  const switchCamera = async () => {
    if (cameras.length < 2 || !activeCameraId) return;
    const idx = cameras.findIndex((c) => c.id === activeCameraId);
    const next = cameras[(idx + 1) % cameras.length]!;
    await stop();
    await start(next.id);
  };

  useEffect(() => {
    if (enabled) void start();
    return () => {
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { status, cameras, switchCamera, restart: () => start(activeCameraId ?? undefined), stop };
}
