'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    if (!token) {
      setError('Недействительная ссылка');
      return;
    }

    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сброса пароля');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-4 text-sm text-red-400 text-center">
        <p className="font-medium mb-1">Недействительная ссылка</p>
        <p className="text-red-400/80">
          Ссылка для сброса пароля отсутствует или повреждена.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-4 text-sm text-green-400 mb-4">
          <p className="font-medium mb-1">Пароль изменён</p>
          <p className="text-green-400/80">Теперь вы можете войти с новым паролем.</p>
        </div>
        <Link
          href="/login"
          className="inline-block bg-brand hover:bg-brand-light text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          Войти
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Новый пароль"
        type="password"
        placeholder="Минимум 8 символов"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Input
        label="Подтвердите пароль"
        type="password"
        placeholder="Повторите пароль"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" loading={loading}>
        Сохранить пароль
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-white mb-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#6C63FF" />
              <path d="M8 8h5v12H8V8zm7 0h5v7h-5V8z" fill="white" />
            </svg>
            PLGames
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Новый пароль</h1>
          <p className="text-sm text-text-secondary mt-1">Введите новый пароль для аккаунта</p>
        </div>

        <Suspense fallback={
          <div className="text-center text-text-secondary text-sm">Загрузка...</div>
        }>
          <ResetPasswordForm />
        </Suspense>

        <p className="text-center text-sm text-text-secondary mt-6">
          <Link href="/login" className="text-brand hover:text-brand-light transition-colors">
            Вернуться ко входу
          </Link>
        </p>
      </div>
    </div>
  );
}
