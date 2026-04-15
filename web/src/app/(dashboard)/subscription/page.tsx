'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api, PlanInfo, SubscriptionInfo, PaymentHistoryItem, PromoCheckResponse } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TIER_NAMES, formatDate, cn } from '@/lib/utils';

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Месячный',
  quarterly: 'Квартальный',
  yearly: 'Годовой',
};

export default function SubscriptionPage() {
  const { user } = useAuth();

  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Promo state
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<PromoCheckResponse | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');

  // Action state
  const [subscribing, setSubscribing] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [sub, planList, paymentList] = await Promise.all([
        api.billing.getSubscription().catch(() => null),
        api.billing.plans().catch(() => []),
        api.billing.paymentHistory().catch(() => []),
      ]);
      setSubscription(sub);
      setPlans(planList);
      setPayments(paymentList);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(plan: string) {
    setError('');
    setSuccess('');
    setSubscribing(plan);
    try {
      const promo = promoResult?.valid && selectedPlan === plan ? promoCode : undefined;
      const result = await api.billing.subscribe(plan, promo);
      window.open(result.payment_url, '_blank');
      setSuccess('Перенаправляем на страницу оплаты. После оплаты подписка активируется автоматически.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка оформления подписки');
    } finally {
      setSubscribing('');
    }
  }

  async function handleTrial() {
    setError('');
    setSuccess('');
    setTrialLoading(true);
    try {
      await api.billing.activateTrial();
      setSuccess('Пробный период активирован! 7 дней бесплатно.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка активации');
    } finally {
      setTrialLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm('Отменить подписку? Она останется активной до окончания оплаченного периода.')) return;
    setError('');
    setSuccess('');
    setCancelling(true);
    try {
      await api.billing.cancel();
      setSuccess('Подписка отменена. Доступ сохранится до конца оплаченного периода.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отмены');
    } finally {
      setCancelling(false);
    }
  }

  async function handleCheckPromo(plan: string) {
    if (!promoCode.trim()) return;
    setPromoResult(null);
    setPromoLoading(true);
    setSelectedPlan(plan);
    try {
      const result = await api.billing.checkPromo(promoCode.trim(), plan);
      setPromoResult(result);
    } catch (err) {
      setPromoResult({
        valid: false,
        code: promoCode,
        discount_percent: 0,
        discount_amount: null,
        final_price: null,
        message: err instanceof Error ? err.message : 'Ошибка проверки',
      });
    } finally {
      setPromoLoading(false);
    }
  }

  const currentTier = subscription?.tier || user?.subscription_tier || 'free';
  const isFreeTier = currentTier === 'free';
  const canTrial = isFreeTier && !user?.subscription_tier?.includes('trial');

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Подписка</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Подписка</h1>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-2.5 text-sm text-green-400 mb-4">
          {success}
        </div>
      )}

      {/* Current subscription */}
      <Card className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-text-muted mb-1">Текущий тариф</p>
            <p className="text-xl font-bold text-white">
              {TIER_NAMES[currentTier] || currentTier}
            </p>
            {subscription?.expires_at && (
              <p className="text-sm text-text-secondary mt-1">
                {subscription.cancelled_at ? 'Активна до: ' : 'Продлевается: '}
                {new Date(subscription.expires_at).toLocaleDateString('ru-RU')}
                {subscription.days_remaining > 0 && (
                  <span className="text-text-muted ml-2">
                    ({subscription.days_remaining} {subscription.days_remaining === 1 ? 'день' : subscription.days_remaining < 5 ? 'дня' : 'дней'})
                  </span>
                )}
              </p>
            )}
            {subscription?.cancelled_at && (
              <p className="text-sm text-yellow-400 mt-1">Подписка отменена</p>
            )}
          </div>
          {subscription?.is_active && !subscription.cancelled_at && currentTier !== 'free' && (
            <Button
              variant="outline"
              onClick={handleCancel}
              loading={cancelling}
              className="text-red-400 border-red-400/30 hover:bg-red-400/10"
            >
              Отменить
            </Button>
          )}
        </div>
      </Card>

      {/* Trial activation */}
      {canTrial && (
        <Card className="mb-8 border-brand/30 bg-brand/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-semibold text-white">Попробуйте бесплатно</p>
              <p className="text-sm text-text-secondary mt-1">
                7 дней полного доступа без привязки карты
              </p>
            </div>
            <Button onClick={handleTrial} loading={trialLoading}>
              Активировать триал
            </Button>
          </div>
        </Card>
      )}

      {/* Plans */}
      <h2 className="text-lg font-semibold text-white mb-4">Тарифные планы</h2>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const isPopular = plan.tier === 'quarterly';
          const hasPromo = promoResult?.valid && selectedPlan === plan.tier;
          return (
            <Card
              key={plan.tier}
              className={cn(
                'relative',
                isCurrent && 'border-brand',
                isPopular && !isCurrent && 'border-brand/50',
              )}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-medium px-3 py-0.5 rounded-full">
                  Популярный
                </span>
              )}
              <p className="text-sm font-semibold text-white mb-1">
                {PLAN_LABELS[plan.tier] || plan.name}
              </p>
              <p className="text-2xl font-bold text-white">
                {hasPromo && promoResult?.final_price != null ? (
                  <>
                    <span className="line-through text-text-muted text-lg mr-2">
                      {plan.price_total} ₽
                    </span>
                    {promoResult.final_price} ₽
                  </>
                ) : (
                  <>{plan.price_total} ₽</>
                )}
              </p>
              <p className="text-sm text-text-muted">
                {plan.duration_days} дней
                {plan.price_monthly !== plan.price_total && (
                  <span className="ml-1">({plan.price_monthly} ₽/мес)</span>
                )}
              </p>

              <div className="mt-4">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Текущий тариф
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full"
                    loading={subscribing === plan.tier}
                    onClick={() => handleSubscribe(plan.tier)}
                  >
                    Подключить
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Promo code */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Промокод</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              label="Введите промокод"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value.toUpperCase());
                setPromoResult(null);
              }}
              placeholder="PROMO2026"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => handleCheckPromo(selectedPlan || plans[0]?.tier || 'monthly')}
            loading={promoLoading}
            className="shrink-0"
          >
            Проверить
          </Button>
        </div>
        {promoResult && (
          <div className={cn(
            'mt-3 rounded-lg px-4 py-2.5 text-sm',
            promoResult.valid
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          )}>
            {promoResult.message}
            {promoResult.valid && promoResult.final_price != null && (
              <span className="ml-2 font-medium">Итого: {promoResult.final_price} ₽</span>
            )}
          </div>
        )}
      </Card>

      {/* Payment history */}
      {payments.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-white mb-4">История платежей</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted text-left">
                    <th className="pb-3 font-medium">Дата</th>
                    <th className="pb-3 font-medium">План</th>
                    <th className="pb-3 font-medium">Сумма</th>
                    <th className="pb-3 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {payments.map((p) => (
                    <tr key={p.id} className="text-text-secondary">
                      <td className="py-2.5">{formatDate(p.created_at)}</td>
                      <td className="py-2.5">{TIER_NAMES[p.plan] || p.plan}</td>
                      <td className="py-2.5">{p.amount} {p.currency}</td>
                      <td className="py-2.5">
                        <span className={cn(
                          'inline-block px-2 py-0.5 rounded text-xs font-medium',
                          p.status === 'completed'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        )}>
                          {p.status === 'completed' ? 'Оплачен' : 'Ожидание'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
