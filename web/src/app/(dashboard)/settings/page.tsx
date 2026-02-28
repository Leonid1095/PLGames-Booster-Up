'use client';

import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const { user } = useAuth();

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
          <div className="space-y-3">
            <Input label="Текущий пароль" type="password" disabled placeholder="********" />
            <Input label="Новый пароль" type="password" disabled placeholder="********" />
            <Button disabled className="mt-2">Сохранить</Button>
          </div>
          <p className="text-xs text-text-muted mt-3">Функция скоро будет доступна</p>
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
