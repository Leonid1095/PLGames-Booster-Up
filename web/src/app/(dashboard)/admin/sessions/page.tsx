'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, AdminSession, PaginatedResponse } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn, formatDate, formatBytes } from '@/lib/utils';

export default function AdminSessions() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<PaginatedResponse<AdminSession> | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [stopping, setStopping] = useState<string | null>(null);

  useEffect(() => {
    if (user && !user.is_admin) router.push('/dashboard');
  }, [user, router]);

  const load = (p: number, status?: string) => {
    setLoading(true);
    api.admin.sessions(p, status || undefined).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const handleStop = async (id: string) => {
    if (!confirm('Остановить сессию?')) return;
    setStopping(id);
    try {
      await api.admin.stopSession(id);
      load(page, statusFilter);
    } finally {
      setStopping(null);
    }
  };

  const handleFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
    load(1, status);
  };

  if (!user?.is_admin) return null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Сессии</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['', 'active', 'stopped'].map((s) => (
          <button
            key={s}
            onClick={() => handleFilterChange(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm transition-colors',
              statusFilter === s
                ? 'bg-brand text-white'
                : 'bg-surface-card text-text-secondary hover:text-white',
            )}
          >
            {s === '' ? 'Все' : s === 'active' ? 'Активные' : 'Завершённые'}
          </button>
        ))}
      </div>

      <Card>
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
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Статус</th>
                    <th className="pb-2 font-medium">Пинг</th>
                    <th className="pb-2 font-medium">Трафик</th>
                    <th className="pb-2 font-medium">Multipath</th>
                    <th className="pb-2 font-medium">Начало</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {data?.items.map((s) => (
                    <tr key={s.id} className="text-text-secondary">
                      <td className="py-2 text-xs font-mono">{s.user_id.slice(0, 8)}...</td>
                      <td className="py-2">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded',
                          s.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-surface-bg text-text-muted',
                        )}>
                          {s.status === 'active' ? 'Активна' : 'Завершена'}
                        </span>
                      </td>
                      <td className="py-2 font-mono text-xs">
                        {s.avg_ping != null ? `${Math.round(s.avg_ping)}ms` : '—'}
                      </td>
                      <td className="py-2 text-xs">
                        {formatBytes(s.bytes_sent)} / {formatBytes(s.bytes_received)}
                      </td>
                      <td className="py-2">
                        {s.multipath_enabled && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-brand/10 text-brand">MP</span>
                        )}
                      </td>
                      <td className="py-2 text-xs text-text-muted">{formatDate(s.started_at)}</td>
                      <td className="py-2 text-right">
                        {s.status === 'active' && (
                          <Button
                            variant="outline"
                            onClick={() => handleStop(s.id)}
                            loading={stopping === s.id}
                            className="!text-xs !px-2 !py-1 text-red-400 border-red-400/30"
                          >
                            Остановить
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data && data.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => { setPage(page - 1); load(page - 1, statusFilter); }}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-30"
                >
                  &larr; Назад
                </button>
                <span className="text-sm text-text-muted">{page} / {data.pages}</span>
                <button
                  onClick={() => { setPage(page + 1); load(page + 1, statusFilter); }}
                  disabled={page >= data.pages}
                  className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-30"
                >
                  Далее &rarr;
                </button>
              </div>
            )}

            {data?.items.length === 0 && (
              <p className="text-center text-text-muted py-8">Нет сессий</p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
