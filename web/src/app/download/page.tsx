import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Скачать клиент',
  description: 'Скачайте клиент PLGames Booster UP для Windows. Лёгкий, быстрый, без рекламы.',
};

const requirements = [
  { label: 'ОС', value: 'Windows 10/11 (64-bit)' },
  { label: 'RAM', value: '2 ГБ' },
  { label: 'Диск', value: '50 МБ' },
  { label: 'Сеть', value: 'Широкополосное подключение' },
];

const steps = [
  'Скачайте установщик PLGames.exe',
  'Запустите установщик и следуйте инструкциям',
  'Войдите в аккаунт или зарегистрируйтесь',
  'Запустите игру — клиент определит её автоматически',
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Скачать PLGames</h1>
          <p className="text-text-secondary max-w-lg mx-auto">
            Лёгкий клиент для оптимизации игрового соединения. Менее 10 МБ, без рекламы, без слежки.
          </p>
        </div>

        {/* Download Card */}
        <Card className="text-center mb-8">
          <div className="mb-4">
            <svg className="w-16 h-16 text-brand mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">PLGames Client v0.1.0-alpha</h2>
          <p className="text-sm text-text-muted mb-6">Windows 10/11 (64-bit) &middot; ~8 МБ</p>
          <Button disabled className="text-base px-8 py-3">
            Клиент в разработке
          </Button>
          <p className="text-xs text-text-muted mt-3">
            Клиент находится в стадии разработки. Следите за обновлениями.
          </p>
        </Card>

        {/* System Requirements */}
        <Card className="mb-8">
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
