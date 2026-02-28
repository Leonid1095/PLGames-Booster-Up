'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, type UserStats } from '@/lib/api';
import { StatCard } from '@/components/dashboard/StatCard';
import { formatBytes, TIER_NAMES } from '@/lib/utils';
import type { Metadata } from 'next';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.users.stats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Привет, {user?.username}!
        </h1>
        <p className="text-text-secondary mt-1">
          Тариф:{' '}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/30 px-2.5 py-0.5 text-xs font-medium text-brand">
            {TIER_NAMES[user?.subscription_tier || 'trial'] || user?.subscription_tier}
          </span>
        </p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface-card border border-surface-border rounded-xl p-5 animate-pulse">
              <div className="h-3 w-20 bg-surface-hover rounded mb-3" />
              <div className="h-7 w-16 bg-surface-hover rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Всего сессий"
            value={String(stats?.total_sessions ?? 0)}
          />
          <StatCard
            label="Средний пинг"
            value={stats?.avg_ping ? `${Math.round(stats.avg_ping)} мс` : '—'}
          />
          <StatCard
            label="Отправлено"
            value={formatBytes(stats?.total_bytes_sent ?? 0)}
          />
          <StatCard
            label="Получено"
            value={formatBytes(stats?.total_bytes_received ?? 0)}
          />
        </div>
      )}

      {stats?.favorite_game && (
        <div className="mt-6 bg-surface-card border border-surface-border rounded-xl p-5">
          <p className="text-sm text-text-muted">Любимая игра</p>
          <p className="text-lg font-semibold text-white mt-1">{stats.favorite_game}</p>
        </div>
      )}
    </div>
  );
}
