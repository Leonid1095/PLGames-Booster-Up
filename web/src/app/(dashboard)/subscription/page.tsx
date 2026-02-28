'use client';

import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TIER_NAMES } from '@/lib/utils';
import { cn } from '@/lib/utils';

const plans = [
  { key: 'trial', price: 'Бесплатно', period: '7 дней' },
  { key: 'basic', price: '149 ₽', period: '/ мес' },
  { key: 'pro', price: '299 ₽', period: '/ мес' },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const currentTier = user?.subscription_tier || 'trial';

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Подписка</h1>

      <Card className="mb-8">
        <p className="text-sm text-text-muted mb-1">Текущий тариф</p>
        <p className="text-xl font-bold text-white">
          {TIER_NAMES[currentTier] || currentTier}
        </p>
        {user?.subscription_expires_at && (
          <p className="text-sm text-text-secondary mt-1">
            Активна до: {new Date(user.subscription_expires_at).toLocaleDateString('ru-RU')}
          </p>
        )}
      </Card>

      <h2 className="text-lg font-semibold text-white mb-4">Доступные тарифы</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentTier;
          const isUpgrade = !isCurrent && plan.key !== 'trial';
          return (
            <Card
              key={plan.key}
              className={cn(isCurrent && 'border-brand')}
            >
              <p className="text-sm font-semibold text-white mb-1">{TIER_NAMES[plan.key]}</p>
              <p className="text-2xl font-bold text-white">
                {plan.price}
                <span className="text-sm text-text-muted font-normal ml-1">{plan.period}</span>
              </p>

              <div className="mt-4">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Текущий тариф
                  </Button>
                ) : isUpgrade ? (
                  <div className="relative">
                    <Button variant="primary" className="w-full" disabled>
                      Улучшить
                    </Button>
                    <span className="absolute -top-2 -right-2 bg-brand/20 text-brand text-xs px-2 py-0.5 rounded-full">
                      Скоро
                    </span>
                  </div>
                ) : (
                  <Button variant="ghost" className="w-full" disabled>
                    —
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-sm text-text-muted mt-6">
        Оплата через DonatePay будет доступна в ближайшем обновлении.
      </p>
    </div>
  );
}
