'use client';

import { useEffect, useState } from 'react';
import { api, type SessionHistoryItem } from '@/lib/api';
import { formatBytes, formatDuration, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-400',
  stopped: 'bg-surface-hover text-text-muted',
  error: 'bg-red-500/10 text-red-400',
};

export default function HistoryPage() {
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.sessions.history()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">История сессий</h1>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-surface-card border border-surface-border rounded-xl p-4 animate-pulse">
              <div className="h-4 w-48 bg-surface-hover rounded" />
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-surface-card border border-surface-border rounded-xl p-12 text-center">
          <svg className="w-12 h-12 text-text-muted mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p className="text-text-secondary">Нет сессий</p>
          <p className="text-sm text-text-muted mt-1">Запустите клиент и начните игру</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left">
                <th className="pb-3 text-text-muted font-medium">Игра</th>
                <th className="pb-3 text-text-muted font-medium">Узел</th>
                <th className="pb-3 text-text-muted font-medium">Статус</th>
                <th className="pb-3 text-text-muted font-medium">Пинг</th>
                <th className="pb-3 text-text-muted font-medium">Трафик</th>
                <th className="pb-3 text-text-muted font-medium">Начало</th>
                <th className="pb-3 text-text-muted font-medium">Длительность</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const duration = s.started_at && s.ended_at
                  ? Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000)
                  : null;

                return (
                  <tr key={s.id} className="border-b border-surface-border/50 hover:bg-surface-hover/30">
                    <td className="py-3 text-white">{s.game_name}</td>
                    <td className="py-3 text-text-secondary">{s.node_location}</td>
                    <td className="py-3">
                      <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full', statusColors[s.status] || statusColors.stopped)}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 text-text-secondary">{s.avg_ping ? `${Math.round(s.avg_ping)} мс` : '—'}</td>
                    <td className="py-3 text-text-secondary">{formatBytes(s.bytes_sent + s.bytes_received)}</td>
                    <td className="py-3 text-text-secondary">{formatDate(s.started_at)}</td>
                    <td className="py-3 text-text-secondary">{formatDuration(duration)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
