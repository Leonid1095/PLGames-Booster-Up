'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword.length < 8) {
      setPwError('Новый пароль должен содержать минимум 8 символов');
      return;
    }

    setPwLoading(true);
    try {
      const res = await api.auth.changePassword(oldPassword, newPassword);
      setPwSuccess(res.message);
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Ошибка смены пароля');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Настройки</h1>

      <div className="space-y-6 max-w-lg">
        {/* Profile Info */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Профиль</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-text-muted">Email</p>
              <p className="text-sm text-white">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Имя пользователя</p>
              <p className="text-sm text-white">{user?.username}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Дата регистрации</p>
              <p className="text-sm text-white">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—'}
              </p>
            </div>
          </div>
        </Card>

        {/* Change Password */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Смена пароля</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <Input
              label="Текущий пароль"
              type="password"
              placeholder="********"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
            <Input
              label="Новый пароль"
              type="password"
              placeholder="Минимум 8 символов"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            {pwError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-2.5 text-sm text-green-400">
                {pwSuccess}
              </div>
            )}
            <Button type="submit" loading={pwLoading} className="mt-2">
              Сохранить
            </Button>
          </form>
        </Card>

        {/* Telegram */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Telegram</h2>
          <p className="text-sm text-text-secondary mb-3">
            Привяжите Telegram для уведомлений и управления подпиской.
          </p>
          <Button disabled variant="outline">Привязать Telegram</Button>
          <p className="text-xs text-text-muted mt-3">Функция скоро будет доступна</p>
        </Card>
      </div>
    </div>
  );
}
