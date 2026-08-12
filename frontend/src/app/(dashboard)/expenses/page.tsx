'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Plus, Trash2, WalletCards } from 'lucide-react';

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  createdAt: string;
  createdBy: { id: number; email: string };
}

const CATEGORIES = [
  { value: 'RENT', label: 'Аренда' },
  { value: 'SALARY', label: 'Зарплата' },
  { value: 'LOGISTICS', label: 'Логистика' },
  { value: 'MARKETING', label: 'Маркетинг' },
  { value: 'UTILITIES', label: 'Коммуналка' },
  { value: 'TAXES', label: 'Налоги' },
  { value: 'OTHER', label: 'Другое' },
];

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await api.get<Expense[]>('/expenses');
      setExpenses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    setIsSubmitting(true);
    try {
      const res = await api.post<Expense>('/expenses', {
        title,
        amount: Number(amount),
        category,
      });
      setExpenses([res.data, ...expenses]);
      setIsModalOpen(false);
      setTitle('');
      setAmount('');
      setCategory('OTHER');
    } catch (err) {
      console.error(err);
      alert('Ошибка при добавлении расхода');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот расход?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (err) {
      console.error(err);
      alert('Ошибка при удалении');
    }
  };

  if (user?.role !== 'OWNER' && user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-400">Нет доступа</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Учет расходов</h1>
          <p className="text-sm text-muted">Контролируйте траты магазина</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Добавить расход
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="hidden md:table-header-group">
              <tr className="border-b border-subtle text-muted whitespace-nowrap">
                <th className="py-3 px-4 font-medium">Дата</th>
                <th className="py-3 px-4 font-medium">Название</th>
                <th className="py-3 px-4 font-medium">Категория</th>
                <th className="py-3 px-4 font-medium">Сумма</th>
                <th className="py-3 px-4 font-medium">Сотрудник</th>
                {user.role === 'OWNER' && <th className="py-3 px-4 font-medium text-right">Действия</th>}
              </tr>
            </thead>
            <tbody className="flex flex-col md:table-row-group divide-y divide-subtle">
              {isLoading ? (
                <tr className="flex md:table-row">
                  <td colSpan={6} className="py-8 w-full text-center text-muted"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr className="flex md:table-row">
                  <td colSpan={6} className="py-8 w-full text-center text-muted">Расходов пока нет</td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="flex flex-col md:table-row bg-surface md:hover:bg-surface-2 transition-colors p-4 md:p-0">
                    <td className="md:px-4 md:py-3 mb-2 md:mb-0">
                      <div className="flex justify-between items-center md:block">
                        <span className="md:hidden text-muted">Дата:</span>
                        <span className="text-text-primary">
                          {new Date(expense.createdAt).toLocaleDateString('ru-KG')}
                        </span>
                      </div>
                    </td>
                    <td className="md:px-4 md:py-3 mb-2 md:mb-0">
                      <div className="flex justify-between items-center md:block">
                        <span className="md:hidden text-muted">Название:</span>
                        <span className="font-medium text-text-primary">{expense.title}</span>
                      </div>
                    </td>
                    <td className="md:px-4 md:py-3 mb-2 md:mb-0">
                      <div className="flex justify-between items-center md:block">
                        <span className="md:hidden text-muted">Категория:</span>
                        <span className="text-muted">
                          {CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                        </span>
                      </div>
                    </td>
                    <td className="md:px-4 md:py-3 mb-2 md:mb-0 text-right md:text-left">
                      <div className="flex justify-between items-center md:block">
                        <span className="md:hidden text-muted">Сумма:</span>
                        <span className="font-bold text-red-400">-{expense.amount.toLocaleString('ru-KG')} с.</span>
                      </div>
                    </td>
                    <td className="md:px-4 md:py-3 mb-3 md:mb-0">
                      <div className="flex justify-between items-center md:block">
                        <span className="md:hidden text-muted">Сотрудник:</span>
                        <span className="text-muted text-xs md:text-sm">{expense.createdBy.email.split('@')[0]}</span>
                      </div>
                    </td>
                    {user.role === 'OWNER' && (
                      <td className="md:px-4 md:py-3 border-t border-subtle pt-3 md:border-t-0 md:pt-0">
                        <div className="flex justify-end">
                          <button 
                            onClick={() => handleDelete(expense.id)}
                            className="w-10 h-10 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-muted bg-surface-2 md:bg-transparent hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
                          >
                            <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-2 border border-subtle rounded-xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
              <WalletCards className="w-6 h-6 text-accent" />
              Новый расход
            </h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1">Название расхода (на что потратили)</label>
                <input 
                  type="text" 
                  required 
                  className="input" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Например: Пакеты для магазина"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted mb-1">Сумма (сом)</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    className="input" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted mb-1">Категория</label>
                  <select 
                    className="input" 
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-subtle">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="btn-secondary"
                  disabled={isSubmitting}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="btn-primary flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
