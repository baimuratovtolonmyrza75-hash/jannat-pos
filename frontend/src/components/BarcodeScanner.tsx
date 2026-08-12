'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  BrowserMultiFormatReader,
  NotFoundException,
  BarcodeFormat,
  DecodeHintType,
} from '@zxing/library';
import { X, Camera, CameraOff, RefreshCw, Image as ImageIcon } from 'lucide-react';

export interface ScanResult {
  text: string;
  format: string;
}

interface BarcodeScannerProps {
  onScan: (result: ScanResult) => void;
  onClose: () => void;
  title?: string;
  continuous?: boolean;
  pauseAfterScan?: number;
}

function isHttps() {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

/**
 * Universal camera barcode scanner component.
 * On HTTPS: uses live video stream via getUserMedia.
 * On HTTP (local dev): falls back to capture-photo mode (works on all mobile browsers).
 */
export function BarcodeScanner({
  onScan,
  onClose,
  title = 'Сканировать штрих-код',
  continuous = false,
  pauseAfterScan = 1500,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [forcePhotoMode, setForcePhotoMode] = useState(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Use photo-capture mode on HTTP or if explicitly forced
  const usePhotoMode = !isHttps() || forcePhotoMode;

  const initReader = useCallback(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    return new BrowserMultiFormatReader(hints, 150);
  }, []);

  // ── PHOTO MODE (HTTP) ─────────────────────────────────────────────────────
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError('');
    setPhotoProcessing(true);

    try {
      const url = URL.createObjectURL(file);
      const reader = readerRef.current ?? initReader();
      readerRef.current = reader;

      const img = new window.Image();
      img.src = url;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('Не удалось загрузить фото'));
      });

      // Decode directly from the image element (ZXing handles canvas internally)
      const readerAny = reader as any;
      const result = await (readerAny.decodeFromImageElement
        ? readerAny.decodeFromImageElement(img)
        : readerAny.decodeFromImageUrl(url));
      const text = result.getText();
      const format = result.getBarcodeFormat().toString();

      setLastScanned(text);
      setScanCount((c) => c + 1);
      URL.revokeObjectURL(url);

      if (continuous) {
        onScan({ text, format });
        setPhotoProcessing(false);
        // Reset file input so user can scan again
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        onScan({ text, format });
        onClose();
      }
    } catch {
      setPhotoError('Штрих-код не найден на фото. Попробуйте ещё раз (ближе, ровнее).');
      setPhotoProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── VIDEO MODE (HTTPS) ────────────────────────────────────────────────────
  useEffect(() => {
    if (usePhotoMode) return;

    const reader = initReader();
    readerRef.current = reader;

    reader.listVideoInputDevices().then((devices) => {
      if (devices.length === 0) {
        setForcePhotoMode(true); // Fallback to photo mode if no cameras
        return;
      }
      setCameras(devices);
      const backCamera = devices.find(
        (d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment'),
      );
      setSelectedCamera(backCamera?.deviceId || devices[devices.length - 1].deviceId);
    }).catch(() => {
      setForcePhotoMode(true); // Fallback to photo mode on error
    });

    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usePhotoMode]);

  useEffect(() => {
    if (usePhotoMode) return;
    if (selectedCamera && videoRef.current && readerRef.current) {
      startScanning();
    }
    return () => { readerRef.current?.reset(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera, usePhotoMode]);

  const cleanup = () => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    readerRef.current?.reset();
    setIsScanning(false);
  };

  const startScanning = async () => {
    if (!videoRef.current || !readerRef.current || !selectedCamera) return;
    setError('');
    setIsScanning(true);
    setIsPaused(false);

    try {
      await readerRef.current.decodeFromVideoDevice(
        selectedCamera,
        videoRef.current,
        (result, err) => {
          if (result) {
            const text = result.getText();
            const format = result.getBarcodeFormat().toString();
            setLastScanned(text);
            setScanCount((c) => c + 1);
            if (continuous) {
              setIsPaused(true);
              onScan({ text, format });
              pauseTimerRef.current = setTimeout(() => setIsPaused(false), pauseAfterScan);
            } else {
              onScan({ text, format });
              cleanup();
              onClose();
            }
          }
          if (err && !(err instanceof NotFoundException)) {
            console.warn('Scan error:', err.message);
          }
        },
      );
    } catch (e: unknown) {
      // If camera access fails entirely, fallback to photo mode automatically
      setForcePhotoMode(true);
      setIsScanning(false);
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIdx = cameras.findIndex((c) => c.deviceId === selectedCamera);
    const nextIdx = (currentIdx + 1) % cameras.length;
    readerRef.current?.reset();
    setSelectedCamera(cameras[nextIdx].deviceId);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    onScan({ text: manualInput.trim(), format: 'MANUAL' });
    if (continuous) {
      setManualInput('');
    } else {
      onClose();
    }
  };

  // ── PHOTO MODE UI ─────────────────────────────────────────────────────────
  if (usePhotoMode) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-black">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-accent" />
            Фото-сканер
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Photo capture area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 relative">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />

          {photoProcessing ? (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white text-sm">Распознаём штрих-код...</p>
            </div>
          ) : lastScanned && !continuous ? null : (
            <>
              {/* Camera icon & instruction */}
              <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-white/30 flex flex-col items-center justify-center gap-3">
                <Camera className="w-14 h-14 text-white/40" />
                <p className="text-white/40 text-xs text-center px-2">Сфотографируйте штрих-код</p>
              </div>

              {photoError && (
                <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-4 py-3 text-center">
                  <p className="text-red-300 text-sm">{photoError}</p>
                </div>
              )}

              {/* Main capture button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-xs bg-accent text-white font-semibold py-4 rounded-2xl text-base flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg"
              >
                <Camera className="w-5 h-5" />
                Сделать фото
              </button>

              {isHttps() && (
                 <button
                  onClick={() => setForcePhotoMode(false)}
                  className="mt-4 text-xs text-white/50 underline"
                 >
                   Вернуться к живому видео
                 </button>
              )}
            </>
          )}

          {/* Success state in continuous mode */}
          {continuous && lastScanned && !photoProcessing && (
            <div className="bg-green-500/20 border border-green-500/40 rounded-lg px-4 py-3 text-center w-full max-w-xs">
              <p className="text-green-300 text-sm">✓ {lastScanned}</p>
              <p className="text-white/40 text-xs mt-1">Отсканировано: {scanCount}</p>
            </div>
          )}

          {continuous && lastScanned && !photoProcessing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-xs bg-accent text-white font-semibold py-4 rounded-2xl text-base flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-lg"
            >
              <Camera className="w-5 h-5" />
              Сканировать ещё
            </button>
          )}
        </div>

        {/* Manual input */}
        <div className="bg-black/90 backdrop-blur-sm px-4 pt-3 pb-6">
          <button
            onClick={() => setShowManual((v) => !v)}
            className="w-full text-center text-xs text-white/50 hover:text-white/80 transition-colors mb-2"
          >
            {showManual ? '↑ Скрыть ручной ввод' : '↓ Ввести вручную'}
          </button>
          {showManual && (
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Введите штрих-код..."
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/40 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
                autoComplete="off"
              />
              <button
                type="submit"
                className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                ОК
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ── VIDEO MODE UI (HTTPS) ────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        <h2 className="text-white font-semibold text-base flex items-center gap-2">
          <Camera className="w-5 h-5 text-accent" />
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {cameras.length > 1 && (
            <button
              onClick={switchCamera}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              title="Переключить камеру"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => { cleanup(); onClose(); }}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {isScanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-10 w-72 h-44">
              <div
                className={`absolute left-0 right-0 h-0.5 bg-accent/80 shadow-[0_0_8px_2px_hsl(262_83%_66%/0.8)]
                  ${isPaused ? 'opacity-0' : ''}`}
                style={{ animation: isPaused ? 'none' : 'scan 2s ease-in-out infinite' }}
              />
              {[
                'top-0 left-0 border-t-4 border-l-4 rounded-tl-md',
                'top-0 right-0 border-t-4 border-r-4 rounded-tr-md',
                'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-md',
                'bottom-0 right-0 border-b-4 border-r-4 rounded-br-md',
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute w-7 h-7 border-accent ${cls} ${isPaused ? 'border-green-400' : ''}`}
                />
              ))}
            </div>
            <div className="absolute bottom-8 left-0 right-0 flex justify-center flex-col items-center gap-4">
              <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm">
                {isPaused ? (
                  <span className="text-green-400 flex items-center gap-2">✓ {lastScanned}</span>
                ) : (
                  <span className="text-white/80">Наведите на штрих-код</span>
                )}
              </div>
              <button
                onClick={() => setForcePhotoMode(true)}
                className="pointer-events-auto bg-white/10 border border-white/30 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs flex items-center gap-2 hover:bg-white/20 transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                Сделать фото
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center px-6">
              <CameraOff className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-white text-sm mb-4">{error}</p>
              <button
                onClick={() => setForcePhotoMode(true)}
                className="bg-accent text-white px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2 mx-auto"
              >
                <ImageIcon className="w-5 h-5" />
                Перейти в Фото-режим
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div className="bg-black/90 backdrop-blur-sm px-4 pt-3 pb-safe pb-4">
        {continuous && scanCount > 0 && (
          <div className="mb-3 text-center">
            <span className="text-xs text-white/60">
              Отсканировано: <span className="text-accent font-bold">{scanCount}</span> товаров
            </span>
          </div>
        )}
        <button
          onClick={() => setShowManual((v) => !v)}
          className="w-full text-center text-xs text-white/50 hover:text-white/80 transition-colors mb-2"
        >
          {showManual ? '↑ Скрыть ручной ввод' : '↓ Ввести вручную'}
        </button>
        {showManual && (
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Введите штрих-код..."
              className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-white/40 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
              autoComplete="off"
            />
            <button
              type="submit"
              className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              ОК
            </button>
          </form>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0%   { top: 8px; }
          50%  { top: calc(100% - 8px); }
          100% { top: 8px; }
        }
      `}</style>
    </div>
  );
}
