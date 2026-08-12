'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Debt, PaymentMethod } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { 
  ClipboardSignature, 
  CreditCard, 
  Banknote, 
  QrCode, 
  CheckCircle2, 
  Search,
  X,
  Loader2,
  FileDown
} from 'lucide-react';
import { exportToExcel } from '@/lib/exportToExcel';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'CASH', label: 'Наличные', icon: Banknote },
  { value: 'CARD', label: 'Карта', icon: CreditCard },
  { value: 'QR', label: 'QR', icon: QrCode },
];

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  const loadDebts = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<Debt[]>('/debts');
      setDebts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, []);

  const filteredDebts = debts.filter(d => 
    !search || 
    d.customer?.name.toLowerCase().includes(search.toLowerCase()) || 
    (d.customer?.phone && d.customer.phone.includes(search))
  );

  const handleExport = () => {
    const exportData = filteredDebts.map(d => ({
      'ID Долга': d.id,
      'Дата': new Date(d.createdAt).toLocaleDateString('ru-KG'),
      'Клиент': d.customer?.name || 'Неизвестно',
      'Телефон': d.customer?.phone || '',
      'Общая сумма': d.totalAmount,
      'Оплачено': d.paidAmount,
      'Остаток': d.totalAmount - d.paidAmount,
      'Статус': d.isPaidOff ? 'Оплачен' : 'В долгу'
    }));
    exportToExcel(exportData, 'Должники_Jannat', 'Долги');
  };

  return (
    <AuthGuard allowedRoles={['OWNER', 'ADMIN', 'CASHIER']}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Должники</h1>
            <p className="text-sm text-muted">Список клиентов, взявших товар в долг</p>
          </div>
          <button 
            onClick={handleExport}
            className="btn-secondary flex items-center gap-2 justify-center"
          >
            <FileDown className="w-5 h-5 text-green-400" />
            Экспорт в Excel
          </button>
        </div>

        <div className="card">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input 
              type="text"
              placeholder="Поиск по имени или телефону..."
              className="input !pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mt-4">
            {isLoading ? (
              <div className="py-8 text-center text-muted"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></div>
            ) : filteredDebts.length === 0 ? (
              <div className="py-8 text-center text-muted">Ничего не найдено</div>
            ) : (
              <>
                {/* Mobile View (Cards) */}
                <div className="md:hidden space-y-3">
                  {filteredDebts.map((debt) => {
                    const remaining = debt.totalAmount - debt.paidAmount;
                    return (
                      <div 
                        key={debt.id} 
                        className="p-4 rounded-xl border border-subtle bg-surface-2 cursor-pointer hover:border-accent/30 transition-colors"
                        onClick={() => setSelectedDebt(debt)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-medium text-text-primary text-base">{debt.customer?.name}</div>
                            {debt.customer?.phone && <div className="text-xs text-muted mt-0.5">{debt.customer.phone}</div>}
                          </div>
                          <div>
                            {debt.isPaidOff ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 bg-green-500/10 text-green-400 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Оплачен
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 bg-red-500/10 text-red-400 rounded-full">
                                <ClipboardSignature className="w-3 h-3" /> В долгу
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-end text-sm">
                          <div className="space-y-1 text-xs">
                            <p className="text-muted">Дата: <span className="text-text-primary">{new Date(debt.createdAt).toLocaleDateString('ru-KG')}</span></p>
                            <p className="text-muted">Сумма: <span className="text-text-primary">{debt.totalAmount.toLocaleString('ru-KG')} с.</span></p>
                            <p className="text-muted">Оплачено: <span className="text-green-400">{debt.paidAmount.toLocaleString('ru-KG')} с.</span></p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted mb-0.5 uppercase tracking-wider">Остаток</p>
                            <p className="font-bold text-red-400 text-lg leading-none">{remaining.toLocaleString('ru-KG')} <span className="text-sm font-medium">с.</span></p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-subtle text-sm text-muted">
                        <th className="pb-3 font-medium px-4">Клиент</th>
                        <th className="pb-3 font-medium px-4">Дата долга</th>
                        <th className="pb-3 font-medium px-4">Общая сумма</th>
                        <th className="pb-3 font-medium px-4">Оплачено</th>
                        <th className="pb-3 font-medium px-4">Остаток</th>
                        <th className="pb-3 font-medium px-4 text-right">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {filteredDebts.map((debt) => {
                        const remaining = debt.totalAmount - debt.paidAmount;
                        return (
                          <tr key={debt.id} className="hover:bg-surface-2 transition-colors cursor-pointer group" onClick={() => setSelectedDebt(debt)}>
                            <td className="py-4 px-4">
                              <div className="font-medium text-text-primary">{debt.customer?.name}</div>
                              {debt.customer?.phone && <div className="text-xs text-muted">{debt.customer.phone}</div>}
                            </td>
                            <td className="py-4 px-4 text-sm text-text-primary">
                              {new Date(debt.createdAt).toLocaleDateString('ru-KG')}
                            </td>
                            <td className="py-4 px-4 font-medium text-text-primary">{debt.totalAmount.toLocaleString('ru-KG')} с.</td>
                            <td className="py-4 px-4 font-medium text-green-400">{debt.paidAmount.toLocaleString('ru-KG')} с.</td>
                            <td className="py-4 px-4 font-bold text-red-400">{remaining.toLocaleString('ru-KG')} с.</td>
                            <td className="py-4 px-4 text-right">
                              {debt.isPaidOff ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-green-500/10 text-green-400 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> Оплачен
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-red-500/10 text-red-400 rounded-full">
                                  <ClipboardSignature className="w-3 h-3" /> В долгу
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {selectedDebt && (
        <PayDebtModal 
          debt={selectedDebt} 
          onClose={() => setSelectedDebt(null)} 
          onPaid={() => {
            setSelectedDebt(null);
            loadDebts();
          }}
        />
      )}
    </AuthGuard>
  );
}

function PayDebtModal({ debt, onClose, onPaid }: { debt: Debt; onClose: () => void; onPaid: () => void }) {
  const remaining = debt.totalAmount - debt.paidAmount;
  const [amount, setAmount] = useState<string>(remaining.toString());
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amount);
    if (val <= 0 || val > remaining) {
      setError('Некорректная сумма');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    try {
      await api.post(`/debts/${debt.id}/pay`, {
        amount: val,
        paymentMethod: method,
      });
      onPaid();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Ошибка проведения платежа');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-sm animate-slide-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Погашение долга</h2>
          <button onClick={onClose} className="text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-text-primary">{debt.customer?.name}</p>
            <p className="text-sm text-muted">Остаток долга: <span className="font-bold text-red-400">{remaining.toLocaleString('ru-KG')} с.</span></p>
          </div>

          <form onSubmit={handlePay} className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Сумма платежа (сом)</label>
              <input 
                type="number" 
                className="input" 
                min="1" 
                max={remaining}
                step="0.01"
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                required 
              />
            </div>

            <div>
              <label className="block text-sm text-muted mb-2">Способ оплаты</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMethod(m.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium border transition-all duration-150
                        ${method === m.value
                          ? 'bg-accent/15 border-accent/40 text-accent'
                          : 'bg-surface-2 border-subtle text-muted hover:border-accent/20 hover:text-text-primary'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={isSubmitting || debt.isPaidOff} className="btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Внести платеж'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
