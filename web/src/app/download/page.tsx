import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Скачать клиент',
  description: 'Скачайте клиент PLGames Booster для Windows. Лёгкий, быстрый, без рекламы.',
};

const requirements = [
  { label: 'ОС', value: 'Windows 10/11 (64-bit)' },
  { label: 'RAM', value: '2 ГБ' },
  { label: 'Диск', value: '50 МБ' },
  { label: 'Сеть', value: 'Широкополосное подключение' },
];

const steps = [
  'Скачайте установщик PLGames с GitHub',
  'Запустите установщик и следуйте инструкциям',
  'Войдите в аккаунт или зарегистрируйтесь',
  'Запустите игру — клиент определит её автоматически',
];

const GITHUB_REPO = 'https://github.com/Leonid1095/PLGames-Booster-Up';
const GITHUB_RELEASES = `${GITHUB_REPO}/releases`;

export default function DownloadPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Скачать PLGames</h1>
          <p className="text-text-secondary max-w-lg mx-auto">
            Лёгкий клиент для оптимизации игрового соединения. Без рекламы, без слежки.
          </p>
        </div>

        {/* Download Card */}
        <Card className="text-center mb-6">
          <div className="mb-4">
            <svg className="w-16 h-16 text-brand mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">PLGames Booster v0.1.0</h2>
          <p className="text-sm text-text-muted mb-6">Windows 10/11 (64-bit) &middot; NSIS ~3.6 МБ / MSI ~5.2 МБ</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <a href={GITHUB_RELEASES} target="_blank" rel="noopener noreferrer">
              <Button className="text-base px-8 py-3 glow-brand">
                <svg className="w-5 h-5 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Скачать с GitHub
              </Button>
            </a>
          </div>

          <p className="text-xs text-text-muted">
            Доступны форматы: .exe (NSIS), .msi &middot;{' '}
            <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-light transition-colors">
              Исходный код
            </a>
          </p>
        </Card>

        {/* Features */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Возможности клиента</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Автоматическое определение игры',
              'PLG Protocol (10 байт оверхед)',
              'Multipath — дублирование трафика',
              'Статистика в реальном времени',
              'Сворачивание в системный трей',
              'Автозапуск с Windows',
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                <svg className="w-4 h-4 text-accent-green shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                </svg>
                {f}
              </div>
            ))}
          </div>
        </Card>

        {/* System Requirements */}
        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Системные требования</h2>
          <div className="grid grid-cols-2 gap-4">
            {requirements.map((r) => (
              <div key={r.label}>
                <p className="text-sm text-text-muted">{r.label}</p>
                <p className="text-sm text-white">{r.value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Installation Steps */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4">Установка</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm text-text-secondary">{step}</span>
              </li>
            ))}
          </ol>
        </Card>

        <p className="text-center text-sm text-text-muted mt-8">
          Нужна помощь?{' '}
          <Link href="/#faq" className="text-brand hover:text-brand-light transition-colors">
            Смотрите FAQ
          </Link>
        </p>
      </div>
    </div>
  );
}
