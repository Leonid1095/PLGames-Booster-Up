import { cn } from '@/lib/utils';

const testimonials = [
  {
    name: 'Артём К.',
    game: 'CS2',
    tier: 'Квартальный',
    text: 'Пинг в CS2 упал с 85ms до 48ms. Разница реально ощущается в дуэлях — раньше постоянно проигрывал на пиках, теперь стреляю первым.',
    ping: { before: 85, after: 48 },
  },
  {
    name: 'Дмитрий В.',
    game: 'Dota 2',
    tier: 'Месячный',
    text: 'Играю на EU серверах из Казахстана. Без бустера 110ms и микрофризы, с PLGames стабильно 65ms. За месяц поднялся на 500 MMR.',
    ping: { before: 110, after: 65 },
  },
  {
    name: 'Максим Л.',
    game: 'Valorant',
    tier: 'Годовой',
    text: 'Multipath — киллер-фича. Packet loss в Valorant полностью пропал, хотя провайдер паршивый. Подписался на год сразу.',
    ping: { before: 72, after: 41 },
  },
  {
    name: 'Алиса Н.',
    game: 'Apex Legends',
    tier: 'Месячный',
    text: 'Пробовала ExitLag и WTFast — PLGames дешевле и работает лучше на наших серверах. Пинг ниже, и нет этих рандомных скачков.',
    ping: { before: 95, after: 58 },
  },
  {
    name: 'Илья С.',
    game: 'Fortnite',
    tier: 'Квартальный',
    text: 'Строю быстрее, задержки при переключении оружия исчезли. Триал убедил за первую же катку, оформил подписку не раздумывая.',
    ping: { before: 78, after: 45 },
  },
  {
    name: 'Кирилл Р.',
    game: 'Escape from Tarkov',
    tier: 'Годовой',
    text: 'В Таркове каждая миллисекунда решает. PLG Protocol дал стабильные 35ms на EU, десинхрон почти пропал. Лутаю спокойно теперь.',
    ping: { before: 68, after: 35 },
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,_rgba(108,99,255,0.04),_transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Отзывы игроков
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">
            Реальные результаты наших пользователей
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-surface-card border border-surface-border rounded-2xl p-6 flex flex-col transition-all duration-200 hover:border-surface-hover"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center text-brand text-sm font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    <p className="text-xs text-text-muted">{t.game} · {t.tier}</p>
                  </div>
                </div>
                {/* Stars */}
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className="w-3.5 h-3.5 text-yellow-400" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1L10.2 5.5L15 6.2L11.5 9.6L12.4 14.4L8 12.1L3.6 14.4L4.5 9.6L1 6.2L5.8 5.5L8 1Z" />
                    </svg>
                  ))}
                </div>
              </div>

              {/* Text */}
              <p className="text-sm text-text-secondary leading-relaxed flex-1 mb-4">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Ping comparison */}
              <div className="flex items-center gap-3 pt-3 border-t border-surface-border">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-muted">Было:</span>
                  <span className="text-xs font-mono text-red-400">{t.ping.before}ms</span>
                </div>
                <svg className="w-4 h-4 text-text-muted" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M10 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-text-muted">Стало:</span>
                  <span className="text-xs font-mono text-green-400">{t.ping.after}ms</span>
                </div>
                <span className={cn(
                  'ml-auto text-xs font-medium px-2 py-0.5 rounded-full',
                  'bg-green-500/10 text-green-400',
                )}>
                  -{Math.round(((t.ping.before - t.ping.after) / t.ping.before) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
