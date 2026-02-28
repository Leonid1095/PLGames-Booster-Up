'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    q: 'Что такое PLGames и PLG Protocol?',
    a: 'PLGames — это игровой бустер, который оптимизирует маршрут сетевого трафика между вами и игровым сервером. PLG Protocol — наш собственный UDP-протокол с поддержкой multipath маршрутизации и автоматическим выбором лучшего пути.',
  },
  {
    q: 'Это безопасно? Меня не забанят?',
    a: 'Абсолютно безопасно. PLGames оптимизирует только маршрутизацию сетевого трафика — не модифицирует файлы игры, не внедряется в игровой процесс. Античит-системы не детектируют наш клиент.',
  },
  {
    q: 'На сколько снизится пинг?',
    a: 'Зависит от вашего провайдера и расположения. В среднем снижение составляет 20-40%, а джиттер (скачки пинга) практически полностью исчезает. Попробуйте 7 дней бесплатно и оцените разницу.',
  },
  {
    q: 'Какие игры поддерживаются?',
    a: 'Более 50 популярных онлайн-игр: CS2, Dota 2, Valorant, Apex Legends, Fortnite, League of Legends, PUBG, Overwatch 2 и многие другие. Библиотека постоянно расширяется.',
  },
  {
    q: 'Как оплатить подписку?',
    a: 'Оплата через DonatePay — поддерживаются банковские карты, ЮMoney, QIWI и другие популярные способы оплаты. После оплаты подписка активируется автоматически.',
  },
  {
    q: 'На каких платформах работает?',
    a: 'Сейчас клиент доступен для Windows 10/11 (64-bit). Поддержка Android, iOS и маршрутизаторов в разработке.',
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Частые вопросы</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-surface-card border border-surface-border rounded-xl overflow-hidden hover:border-surface-hover transition-colors">
              <button
                className="w-full flex items-center justify-between p-5 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="text-sm font-medium text-white pr-4">{faq.q}</span>
                <svg
                  className={cn('w-5 h-5 text-text-muted shrink-0 transition-transform duration-200', open === i && 'rotate-180')}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200',
                  open === i ? 'max-h-48 pb-5' : 'max-h-0',
                )}
              >
                <p className="px-5 text-sm text-text-secondary leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
