'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Audit, AuditItem } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { useCameraScanner } from '@/hooks/useCameraScanner';
import {
  ClipboardList,
  Play,
  CheckCircle2,
  Loader2,
  ChevronDown,
  AlertCircle,
  Camera,
  X,
} from 'lucide-react';

// ─── Audit Detail Modal with camera scan ─────────────────────────────────────
function AuditDetailModal({
  audit,
  onClose,
  onComplete,
}: {
  audit: Audit;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [items, setItems] = useState<Array<AuditItem & { inputQty: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastScanResult, setLastScanResult] = useState<{ name: string; ok: boolean } | null>(null);
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    api.get<Audit>(`/audit/${audit.id}`).then((res) => {
      const auditItems = (res.data.auditItems || []).map((ai: AuditItem) => ({
        ...ai,
        inputQty: ai.actualQty || ai.expectedQty,
      }));
      setItems(auditItems);
      setIsLoading(false);
    });
  }, [audit.id]);

  const updateQty = (productId: number, value: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, inputQty: Math.max(0, value) } : item,
      ),
    );
  };

  // Handle scan: increment quantity of matched product
  const handleCameraScan = useCallback(async ({ text }: { text: string }) => {
    // Find product by barcode via API
    try {
      const { data: product } = await api.get(`/products/barcode/${text}`);

      const matchedItem = items.find((i) => i.productId === product.id);
      if (matchedItem) {
        setItems((prev) =>
          prev.map((item) =>
            item.productId === product.id
              ? { ...item, inputQty: item.inputQty + 1 }
              : item,
          ),
        );
        setScanCount((c) => c + 1);
        setLastScanResult({ name: product.name, ok: true });
      } else {
        setLastScanResult({ name: `"${product.name}" не в списке ревизии`, ok: false });
      }
    } catch {
      setLastScanResult({ name: `Баркод "${text}" не найден`, ok: false });
    }

    // Clear notification after 2 sec
    setTimeout(() => setLastScanResult(null), 2000);
  }, [items]);

  const { ScannerModal, openScanner, isOpen: isScannerOpen } = useCameraScanner({
    onScan: handleCameraScan,
    title: 'Сканировать для ревизии',
    continuous: true,
    pauseAfterScan: 500,
  });

  const discrepancies = items.filter((i) => i.inputQty !== i.expectedQty);

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await api.post(`/audit/${audit.id}/submit`, {
        items: items.map((i) => ({
          productId: i.productId,
          actualQty: i.inputQty,
        })),
      });
      onComplete();
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {ScannerModal}

      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="card w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-lg font-bold">Ревизия #{audit.id}</h2>
              <p className="text-sm text-muted">
                {audit.status === 'IN_PROGRESS'
                  ? 'Введите фактическое кол-во или используйте камеру'
                  : 'Завершена'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {discrepancies.length > 0 && (
                <div className="badge-warning flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {discrepancies.length} расхождений
                </div>
              )}
              {scanCount > 0 && (
                <div className="badge-success flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  {scanCount} сканов
                </div>
              )}
            </div>
          </div>

          {/* Camera scan notification */}
          {lastScanResult && (
            <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm animate-slide-in ${
              lastScanResult.ok
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {lastScanResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {lastScanResult.ok ? `✓ +1 шт. — ${lastScanResult.name}` : lastScanResult.name}
            </div>
          )}

          {/* Camera scan button */}
          {audit.status === 'IN_PROGRESS' && (
            <button
              onClick={openScanner}
              className={`mb-3 btn-secondary flex items-center justify-center gap-2 ${isScannerOpen ? 'opacity-50' : ''}`}
            >
              <Camera className="w-4 h-4 text-accent" />
              Сканировать камерой (непрерывно)
            </button>
          )}

          {/* Items table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface z-10">
                  <tr className="border-b border-subtle text-muted">
                    <th className="text-left py-2 font-medium">Товар</th>
                    <th className="text-right py-2 font-medium">Ожидаемо</th>
                    <th className="text-right py-2 font-medium">Фактически</th>
                    <th className="text-right py-2 font-medium">Разница</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {items.map((item) => {
                    const diff = item.inputQty - item.expectedQty;
                    return (
                      <tr key={item.id} className={diff !== 0 ? 'bg-yellow-500/5' : ''}>
                        <td className="py-2">
                          <p className="font-medium text-text-primary">{item.product?.name}</p>
                          <p className="text-xs text-muted">{item.product?.SKU}</p>
                        </td>
                        <td className="py-2 text-right text-muted">{item.expectedQty}</td>
                        <td className="py-2 text-right">
                          {audit.status === 'IN_PROGRESS' ? (
                            <input
                              type="number"
                              min="0"
                              value={item.inputQty}
                              onChange={(e) => updateQty(item.productId, +e.target.value)}
                              className="input w-20 text-center py-1 text-sm"
                            />
                          ) : (
                            <span>{item.actualQty}</span>
                          )}
                        </td>
                        <td className={`py-2 text-right font-medium ${
                          diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-muted'
                        }`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2 mt-3">{error}</p>
          )}

          <div className="flex gap-3 mt-4 pt-4 border-t border-subtle">
            <button onClick={onClose} className="btn-secondary flex-1">Закрыть</button>
            {audit.status === 'IN_PROGRESS' && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle2 className="w-4 h-4" />
                Завершить ревизию
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  const loadAudits = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<Audit[]>('/audit');
      setAudits(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadAudits(); }, []);

  const handleStartAudit = async () => {
    setError('');
    setIsStarting(true);
    try {
      const { data } = await api.post<Audit>('/audit/start');
      setAudits((prev) => [data, ...prev]);
      setSelectedAudit(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Ошибка');
    } finally {
      setIsStarting(false);
    }
  };

  const hasActiveAudit = audits.some((a) => a.status === 'IN_PROGRESS');

  return (
    <AuthGuard allowedRoles={['OWNER', 'ADMIN']}>
      <div className="space-y-6 animate-slide-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-accent" /> Ревизия склада
          </h1>
          <button
            onClick={handleStartAudit}
            disabled={isStarting || hasActiveAudit}
            className="btn-primary flex items-center gap-2"
          >
            {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {hasActiveAudit ? 'Ревизия в процессе' : 'Начать ревизию'}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : (
          <div className="space-y-3">
            {audits.map((audit) => (
              <div
                key={audit.id}
                className="card hover:border-accent/20 transition-all cursor-pointer"
                onClick={() => setSelectedAudit(audit)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    audit.status === 'IN_PROGRESS'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {audit.status === 'IN_PROGRESS'
                      ? <ClipboardList className="w-5 h-5" />
                      : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-text-primary">Ревизия #{audit.id}</p>
                      <span className={audit.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-success'}>
                        {audit.status === 'IN_PROGRESS' ? 'В процессе' : 'Завершена'}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      Начата: {new Date(audit.createdAt).toLocaleString('ru-KG')}
                      {audit.completedAt && ` • Завершена: ${new Date(audit.completedAt).toLocaleString('ru-KG')}`}
                    </p>
                    <p className="text-xs text-muted">
                      Автор: {audit.createdBy?.email} • {audit._count?.auditItems ?? 0} позиций
                    </p>
                  </div>
                  <ChevronDown className="w-5 h-5 text-muted -rotate-90" />
                </div>
              </div>
            ))}

            {audits.length === 0 && (
              <div className="text-center py-16 text-muted">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Ревизий ещё не было</p>
                <p className="text-sm">Начните первую ревизию склада</p>
              </div>
            )}
          </div>
        )}

        {selectedAudit && (
          <AuditDetailModal
            audit={selectedAudit}
            onClose={() => setSelectedAudit(null)}
            onComplete={loadAudits}
          />
        )}
      </div>
    </AuthGuard>
  );
}
