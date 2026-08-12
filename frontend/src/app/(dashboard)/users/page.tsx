'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { User } from '@/lib/types';
import { AuthGuard } from '@/components/AuthGuard';
import { Users, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Владелец',
  ADMIN: 'Администратор',
  CASHIER: 'Кассир',
};

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'badge-purple',
  ADMIN: 'badge-info',
  CASHIER: 'badge-success',
};

function UserModal({
  user,
  onClose,
  onSave,
}: {
  user: Partial<User> | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    email: user?.email || '',
    password: '',
    role: user?.role || 'CASHIER',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md animate-slide-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">
            {user?.id ? 'Редактировать сотрудника' : 'Новый сотрудник'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">
              Пароль {user?.id && <span className="text-xs">(оставьте пустым чтобы не менять)</span>}
            </label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!user?.id}
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Роль</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}
            >
              <option value="CASHIER">Кассир</option>
              <option value="ADMIN">Администратор</option>
              <option value="OWNER">Владелец</option>
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Отмена</button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editUser, setEditUser] = useState<Partial<User> | null | false>(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get<User[]>('/users');
      setUsers(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSave = async (data: Record<string, unknown>) => {
    if ((editUser as User)?.id) {
      const payload = { ...data };
      if (!payload.password) delete payload.password;
      await api.put(`/users/${(editUser as User).id}`, payload);
    } else {
      await api.post('/users', data);
    }
    loadUsers();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить сотрудника?')) return;
    await api.delete(`/users/${id}`);
    loadUsers();
  };

  return (
    <AuthGuard allowedRoles={['OWNER']}>
      <div className="space-y-6 animate-slide-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-accent" /> Сотрудники
          </h1>
          <button
            onClick={() => setEditUser({})}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Добавить сотрудника
          </button>
        </div>

        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-subtle bg-surface-2 text-muted">
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Роль</th>
                  <th className="text-left px-4 py-3 font-medium">Дата создания</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="flex flex-col md:table-row-group divide-y divide-subtle">
                {users.map((user) => (
                  <tr key={user.id} className="flex flex-col md:table-row bg-surface md:hover:bg-surface-2 transition-colors border-b border-subtle md:border-b-0 p-4 md:p-0">
                    <td className="hidden md:table-cell px-4 py-3 text-muted">{user.id}</td>
                    <td className="md:px-4 md:py-3 mb-2 md:mb-0">
                      <div className="flex justify-between items-center md:block">
                        <span className="md:hidden text-muted text-xs">Email:</span>
                        <span className="font-medium text-text-primary text-base md:text-sm">{user.email}</span>
                      </div>
                    </td>
                    <td className="md:px-4 md:py-3 mb-2 md:mb-0">
                      <div className="flex justify-between items-center md:block">
                        <span className="md:hidden text-muted text-xs">Роль:</span>
                        <span className={ROLE_COLORS[user.role] || 'badge'}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </div>
                    </td>
                    <td className="md:px-4 md:py-3 mb-4 md:mb-0 text-muted">
                      <div className="flex justify-between items-center md:block">
                        <span className="md:hidden text-xs">Дата создания:</span>
                        <span>{new Date(user.createdAt).toLocaleDateString('ru-KG')}</span>
                      </div>
                    </td>
                    <td className="md:px-4 md:py-3 pt-3 md:pt-0 border-t border-subtle md:border-t-0">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setEditUser(user)}
                          className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-lg md:rounded text-muted bg-surface-2 md:bg-transparent hover:text-blue-400 md:hover:bg-blue-500/10 transition-colors"
                        >
                          <Pencil className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-lg md:rounded text-muted bg-surface-2 md:bg-transparent hover:text-red-400 md:hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {editUser !== false && (
          <UserModal
            user={editUser}
            onClose={() => setEditUser(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </AuthGuard>
  );
}
