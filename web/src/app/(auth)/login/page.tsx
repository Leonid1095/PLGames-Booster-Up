'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
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
          <h1 className="text-2xl font-bold text-white mt-4">Вход в аккаунт</h1>
          <p className="text-sm text-text-secondary mt-1">Введите данные для входа</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Пароль"
            type="password"
            placeholder="Минимум 8 символов"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="text-right -mt-2">
            <Link href="/forgot-password" className="text-sm text-brand hover:text-brand-light transition-colors">
              Забыли пароль?
            </Link>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Войти
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Нет аккаунта?{' '}
          <Link href="/register" className="text-brand hover:text-brand-light transition-colors">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
}
