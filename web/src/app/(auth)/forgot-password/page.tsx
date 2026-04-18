'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-white mb-2">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="6" fill="#6C63FF"/>
              <path d="M14 4l6 9h-4v11h-4V13H8l6-9z" fill="white"/>
            </svg>
            PLGames
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Сброс пароля</h1>
          <p className="text-sm text-text-secondary mt-1">
            Введите email вашего аккаунта
          </p>
        </div>

        {success ? (
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-4 text-sm text-green-400 text-center">
            <p className="font-medium mb-1">Письмо отправлено</p>
            <p className="text-green-400/80">
              Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля.
              Проверьте почту.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Отправить ссылку
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-text-secondary mt-6">
          Вспомнили пароль?{' '}
          <Link href="/login" className="text-brand hover:text-brand-light transition-colors">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
