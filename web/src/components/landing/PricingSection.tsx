import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const tiers = [
  {
    name: 'Пробный',
    price: 'Бесплатно',
    period: '7 дней',
    features: ['1 игра одновременно', 'Все узлы', 'PLG Protocol', 'Базовая поддержка'],
    cta: 'Попробовать бесплатно',
    popular: false,
  },
  {
    name: 'Базовый',
    price: '149 ₽',
    period: 'в месяц',
    features: ['3 игры одновременно', 'Все узлы', 'PLG Protocol + Multipath', 'Приоритетная поддержка', 'Статистика сессий'],
    cta: 'Подключить',
    popular: true,
  },
  {
    name: 'Про',
    price: '299 ₽',
    period: 'в месяц',
    features: ['Безлимит игр', 'Все узлы + приоритет', 'PLG Protocol + Multipath', 'VIP поддержка', 'Детальная аналитика', 'API доступ'],
    cta: 'Подключить',
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,_rgba(108,99,255,0.04),_transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Тарифы</h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">Начни бесплатно. Обновись, когда будешь готов.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto items-start">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                'relative bg-surface-card border rounded-2xl p-7 flex flex-col transition-all duration-200',
                tier.popular
                  ? 'border-brand md:scale-105 glow-brand'
                  : 'border-surface-border hover:border-surface-hover',
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-medium px-4 py-1 rounded-full">
                  Популярный
                </div>
              )}

              <h3 className="text-lg font-semibold text-white mb-1">{tier.name}</h3>
              <div className="mb-6">
                <span className="text-3xl font-bold text-white">{tier.price}</span>
                {tier.period !== '7 дней' && <span className="text-sm text-text-muted ml-1">/ {tier.period}</span>}
                {tier.period === '7 дней' && <span className="text-sm text-text-muted ml-2">{tier.period}</span>}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <svg className="w-4 h-4 text-accent-green mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link href="/register">
                <Button
                  variant={tier.popular ? 'primary' : 'outline'}
                  className="w-full"
                >
                  {tier.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
