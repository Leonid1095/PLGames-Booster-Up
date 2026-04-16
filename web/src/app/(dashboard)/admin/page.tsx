'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, AdminStats, AdminPayment, AdminSession } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { TIER_NAMES, formatDate } from '@/lib/utils';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !user.is_admin) {
      router.push('/dashboard');
      return;
    }
    Promise.all([
      api.admin.stats().catch(() => null),
      api.admin.payments(1).catch(() => ({ items: [] })),
      api.admin.sessions(1, 'active').catch(() => ({ items: [] })),
    ]).then(([s, p, sess]) => {
      if (s) setStats(s);
      setPayments(p.items.slice(0, 5));
      setSessions(sess.items.slice(0, 5));
    }).finally(() => setLoading(false));
  }, [user, router]);

  if (!user?.is_admin) return null;

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Админ-панель</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Админ-панель</h1>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Пользователей" value={stats?.total_users ?? 0} />
        <StatCard label="Активных подписок" value={stats?.active_subscriptions ?? 0} color="text-green-400" />
        <StatCard label="Активных сессий" value={stats?.active_sessions ?? 0} color="text-brand" />
        <StatCard label="Выручка (30д)" value={`${stats?.revenue_30d ?? 0} ₽`} color="text-yellow-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent payments */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Последние платежи</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-text-muted">Нет платежей</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-surface-border last:border-0">
                  <div>
                    <span className="text-text-secondary">{p.user_id.slice(0, 8)}...</span>
                    <span className="text-text-muted ml-2">{TIER_NAMES[p.plan] || p.plan}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-mono">{p.amount} ₽</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      p.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {p.status === 'completed' ? 'OK' : 'Ожид.'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Active sessions */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Активные сессии</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-text-muted">Нет активных сессий</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm py-1.5 border-b border-surface-border last:border-0">
                  <div>
                    <span className="text-text-secondary">{s.user_id.slice(0, 8)}...</span>
                    <span className="text-text-muted ml-2">{formatDate(s.started_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.avg_ping != null && (
                      <span className="text-xs font-mono text-text-muted">{Math.round(s.avg_ping)}ms</span>
                    )}
                    {s.multipath_enabled && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-brand/10 text-brand">MP</span>
                    )}
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
  return (
    <Card>
      <p className="text-sm text-text-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </Card>
  );
}
