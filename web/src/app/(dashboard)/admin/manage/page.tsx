'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, AdminUser, AdminNode, AdminPromo, PaginatedResponse } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn, formatDate, TIER_NAMES } from '@/lib/utils';

type Tab = 'users' | 'nodes' | 'promos';

export default function AdminManage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('users');

  useEffect(() => {
    if (user && !user.is_admin) router.push('/dashboard');
  }, [user, router]);

  if (!user?.is_admin) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Управление</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-card rounded-lg p-1 w-fit">
        {([
          ['users', 'Пользователи'],
          ['nodes', 'Ноды'],
          ['promos', 'Промокоды'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              tab === key ? 'bg-brand text-white' : 'text-text-secondary hover:text-white',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'nodes' && <NodesTab />}
      {tab === 'promos' && <PromosTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// USERS TAB
// ═══════════════════════════════════════════════════════════════════════

function UsersTab() {
  const [data, setData] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTier, setEditTier] = useState('');
  const [saving, setSaving] = useState(false);

  const load = (p: number, s?: string) => {
    setLoading(true);
    api.admin.users(p, s || undefined).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, search);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      await api.admin.updateUser(id, { subscription_tier: editTier });
      setEditingId(null);
      load(page, search);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <Input
          placeholder="Поиск по email или username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="outline">Найти</Button>
      </form>

      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-left">
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Username</th>
                  <th className="pb-2 font-medium">Тариф</th>
                  <th className="pb-2 font-medium">Admin</th>
                  <th className="pb-2 font-medium">Регистрация</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {data?.items.map((u) => (
                  <tr key={u.id} className="text-text-secondary">
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">{u.username}</td>
                    <td className="py-2">
                      {editingId === u.id ? (
                        <select
                          value={editTier}
                          onChange={(e) => setEditTier(e.target.value)}
                          className="bg-surface-bg border border-surface-border rounded px-2 py-1 text-xs text-white"
                        >
                          {['free', 'trial', 'monthly', 'quarterly', 'yearly'].map((t) => (
                            <option key={t} value={t}>{TIER_NAMES[t] || t}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-surface-bg">
                          {TIER_NAMES[u.subscription_tier] || u.subscription_tier}
                        </span>
                      )}
                    </td>
                    <td className="py-2">
                      {u.is_admin && <span className="text-xs text-red-400 font-medium">Admin</span>}
                    </td>
                    <td className="py-2 text-xs text-text-muted">{formatDate(u.created_at)}</td>
                    <td className="py-2 text-right">
                      {editingId === u.id ? (
                        <div className="flex gap-1 justify-end">
                          <Button onClick={() => handleSave(u.id)} loading={saving} className="!text-xs !px-2 !py-1">
                            Сохранить
                          </Button>
                          <Button variant="ghost" onClick={() => setEditingId(null)} className="!text-xs !px-2 !py-1">
                            Отмена
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(u.id); setEditTier(u.subscription_tier); }}
                          className="text-xs text-brand hover:text-brand-light"
                        >
                          Изменить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.pages > 1 && (
            <Pagination page={page} pages={data.pages} onChange={(p) => { setPage(p); load(p, search); }} />
          )}
        </>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// NODES TAB
// ═══════════════════════════════════════════════════════════════════════

function NodesTab() {
  const [nodes, setNodes] = useState<AdminNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', city: '', ip_address: '', max_sessions: '1000' });
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    api.admin.nodes().then(setNodes).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.admin.createNode({ ...form, max_sessions: Number(form.max_sessions) });
      setShowCreate(false);
      setForm({ name: '', location: '', city: '', ip_address: '', max_sessions: '1000' });
      load();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Деактивировать ноду?')) return;
    await api.admin.deleteNode(id);
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-muted">{nodes.length} нод</p>
        <Button onClick={() => setShowCreate(!showCreate)} variant="outline" className="!text-xs">
          + Добавить ноду
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 mb-4 p-4 bg-surface-bg rounded-lg">
          <Input label="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Локация (DE/SE/US/LV)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
          <Input label="Город" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
          <Input label="IP-адрес" value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} required />
          <Input label="Макс. сессий" type="number" value={form.max_sessions} onChange={(e) => setForm({ ...form, max_sessions: e.target.value })} />
          <div className="flex items-end">
            <Button type="submit" loading={creating}>Создать</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted text-left">
                <th className="pb-2 font-medium">Имя</th>
                <th className="pb-2 font-medium">Локация</th>
                <th className="pb-2 font-medium">IP</th>
                <th className="pb-2 font-medium">Статус</th>
                <th className="pb-2 font-medium">Нагрузка</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {nodes.map((n) => (
                <tr key={n.id} className="text-text-secondary">
                  <td className="py-2">{n.name}</td>
                  <td className="py-2">{n.city}, {n.location}</td>
                  <td className="py-2 font-mono text-xs">{n.ip_address}</td>
                  <td className="py-2">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      n.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400',
                    )}>
                      {n.status}
                    </span>
                  </td>
                  <td className="py-2 text-xs">{n.current_load} / {n.max_sessions}</td>
                  <td className="py-2 text-right">
                    {n.status === 'active' && (
                      <button onClick={() => handleDelete(n.id)} className="text-xs text-red-400 hover:text-red-300">
                        Деактивировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PROMOS TAB
// ═══════════════════════════════════════════════════════════════════════

function PromosTab() {
  const [promos, setPromos] = useState<AdminPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: '', discount_percent: '10', max_uses: '0', applicable_plans: 'all' });
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    api.admin.promos().then(setPromos).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.admin.createPromo({
        code: form.code.toUpperCase(),
        discount_percent: Number(form.discount_percent),
        max_uses: Number(form.max_uses),
        applicable_plans: form.applicable_plans,
      });
      setShowCreate(false);
      setForm({ code: '', discount_percent: '10', max_uses: '0', applicable_plans: 'all' });
      load();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Деактивировать промокод?')) return;
    await api.admin.deletePromo(id);
    load();
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-muted">{promos.length} промокодов</p>
        <Button onClick={() => setShowCreate(!showCreate)} variant="outline" className="!text-xs">
          + Создать промокод
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 mb-4 p-4 bg-surface-bg rounded-lg">
          <Input label="Код" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="PROMO2026" />
          <Input label="Скидка %" type="number" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
          <Input label="Макс. использований (0 = безлимит)" type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
          <div>
            <label className="block text-sm text-text-secondary mb-1">Планы</label>
            <select
              value={form.applicable_plans}
              onChange={(e) => setForm({ ...form, applicable_plans: e.target.value })}
              className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="all">Все</option>
              <option value="monthly">Месячный</option>
              <option value="quarterly">Квартальный</option>
              <option value="yearly">Годовой</option>
              <option value="monthly,quarterly">Месячный + Квартальный</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" loading={creating}>Создать</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-muted text-left">
                <th className="pb-2 font-medium">Код</th>
                <th className="pb-2 font-medium">Скидка</th>
                <th className="pb-2 font-medium">Использовано</th>
                <th className="pb-2 font-medium">Планы</th>
                <th className="pb-2 font-medium">Статус</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {promos.map((p) => (
                <tr key={p.id} className="text-text-secondary">
                  <td className="py-2 font-mono text-white">{p.code}</td>
                  <td className="py-2">
                    {p.discount_percent > 0 ? `${p.discount_percent}%` : `${p.discount_amount} ₽`}
                  </td>
                  <td className="py-2">{p.current_uses}{p.max_uses > 0 ? ` / ${p.max_uses}` : ''}</td>
                  <td className="py-2 text-xs">{p.applicable_plans}</td>
                  <td className="py-2">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      p.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400',
                    )}>
                      {p.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {p.is_active && (
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-300">
                        Деактивировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════════════════════════════════════

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed"
      >
        &larr; Назад
      </button>
      <span className="text-sm text-text-muted">
        {page} / {pages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Далее &rarr;
      </button>
    </div>
  );
}
