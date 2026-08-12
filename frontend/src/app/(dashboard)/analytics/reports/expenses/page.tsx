'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Loader2, ArrowLeft, Trash2, Plus, X } from 'lucide-react';
import Link from 'next/link';

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  createdAt: string;
  createdBy: { id: number; email: string };
}

export default function ExpensesReportPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', category: 'OTHER' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<Expense[]>('/analytics/expenses');
      setExpenses(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      await api.post('/analytics/expenses', {
        title: form.title,
        amount: +form.amount,
        category: form.category,
      });
      setForm({ title: '', amount: '', category: 'OTHER' });
      setShowModal(false);
      loadData();
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить расход?')) return;
    await api.delete(`/analytics/expenses/${id}`);
    loadData();
  };

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <AuthGuard allowedRoles={['OWNER']}>
      <div className="space-y-6 animate-slide-in">
        <div className="flex items-center gap-4">
          <Link href="/analytics" className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-2 text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold flex-1">Расходы</h1>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>

        <div className="card bg-red-500/10 border-red-500/20 max-w-sm">
          <p className="text-sm text-red-400">Сумма всех расходов (за весь период)</p>
          <p className="text-3xl font-bold text-red-400 mt-1">{totalExpenses.toLocaleString('ru-KG')} с.</p>
        </div>

        <div className="card">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
          ) : expenses.length === 0 ? (
            <p className="text-center text-muted py-8">Расходов не найдено</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-subtle text-left text-muted">
                    <th className="pb-3 px-4 font-medium">Дата</th>
                    <th className="pb-3 px-4 font-medium">Название</th>
                    <th className="pb-3 px-4 font-medium">Категория</th>
                    <th className="pb-3 px-4 font-medium">Добавил</th>
                    <th className="pb-3 px-4 font-medium text-right">Сумма</th>
                    <th className="pb-3 px-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-surface-2 transition-colors">
                      <td className="py-3 px-4 text-muted">{new Date(e.createdAt).toLocaleString('ru-KG')}</td>
                      <td className="py-3 px-4 font-medium">{e.title}</td>
                      <td className="py-3 px-4"><span className="badge badge-purple">{e.category}</span></td>
                      <td className="py-3 px-4 text-muted">{e.createdBy?.email.split('@')[0]}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-400">{e.amount.toLocaleString('ru-KG')} с.</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDelete(e.id)} className="w-8 h-8 inline-flex items-center justify-center rounded text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Expense Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-sm animate-slide-in">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">Добавить расход</h2>
                <button onClick={() => setShowModal(false)} className="text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddExpense} className="space-y-3">
                <div>
                  <label className="block text-sm text-muted mb-1">Название</label>
                  <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Категория</label>
                  <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="OTHER">Другое</option>
                    <option value="RENT">Аренда</option>
                    <option value="SALARY">Зарплата</option>
                    <option value="LOGISTICS">Логистика</option>
                    <option value="MARKETING">Маркетинг</option>
                    <option value="UTILITIES">Коммунальные услуги</option>
                    <option value="TAXES">Налоги</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Сумма (сом)</label>
                  <input type="number" min="0" step="0.01" className="input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Отмена</button>
                  <button type="submit" disabled={isAdding} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
                    Добавить
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
