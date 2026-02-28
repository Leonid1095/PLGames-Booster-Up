'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Metadata } from 'next';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!email) errs.email = 'Введите email';
    if (username.length < 3) errs.username = 'Минимум 3 символа';
    if (username.length > 50) errs.username = 'Максимум 50 символов';
    if (password.length < 8) errs.password = 'Минимум 8 символов';
    if (password.length > 128) errs.password = 'Максимум 128 символов';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await register(email, username, password);
      router.push('/dashboard');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Ошибка регистрации');
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
              <rect width="28" height="28" rx="6" fill="#6C63FF" />
              <path d="M8 8h5v12H8V8zm7 0h5v7h-5V8z" fill="white" />
            </svg>
            PLGames
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Создать аккаунт</h1>
          <p className="text-sm text-text-secondary mt-1">7 дней бесплатно, без карты</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />
          <Input
            label="Имя пользователя"
            type="text"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={errors.username}
            required
          />
          <Input
            label="Пароль"
            type="password"
            placeholder="Минимум 8 символов"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
          />

          {serverError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Зарегистрироваться
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="text-brand hover:text-brand-light transition-colors">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
