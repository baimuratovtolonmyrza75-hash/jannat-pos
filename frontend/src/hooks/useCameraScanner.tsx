'use client';

import { useState, useCallback, ReactNode } from 'react';
import { BarcodeScanner, ScanResult } from '@/components/BarcodeScanner';

interface UseCameraScannerOptions {
  onScan: (result: ScanResult) => void;
  continuous?: boolean;
  title?: string;
  pauseAfterScan?: number;
}

interface UseCameraScannerReturn {
  ScannerModal: ReactNode;
  openScanner: () => void;
  closeScanner: () => void;
  isOpen: boolean;
}

/**
 * Hook that manages BarcodeScanner open/close state and renders it.
 * Usage:
 *   const { ScannerModal, openScanner } = useCameraScanner({ onScan: handleScan });
 *   return <>{ScannerModal}<button onClick={openScanner}>Scan</button></>;
 */
export function useCameraScanner({
  onScan,
  continuous = false,
  title,
  pauseAfterScan,
}: UseCameraScannerOptions): UseCameraScannerReturn {
  const [isOpen, setIsOpen] = useState(false);

  const openScanner = useCallback(() => setIsOpen(true), []);
  const closeScanner = useCallback(() => setIsOpen(false), []);

  const handleScan = useCallback(
    (result: ScanResult) => {
      onScan(result);
      if (!continuous) {
        setIsOpen(false);
      }
    },
    [onScan, continuous],
  );

  const ScannerModal: ReactNode = isOpen ? (
    <BarcodeScanner
      onScan={handleScan}
      onClose={closeScanner}
      title={title}
      continuous={continuous}
      pauseAfterScan={pauseAfterScan}
    />
  ) : null;

  return { ScannerModal, openScanner, closeScanner, isOpen };
}
