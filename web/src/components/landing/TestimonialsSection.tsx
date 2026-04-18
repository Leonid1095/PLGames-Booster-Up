export function TestimonialsSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,_rgba(108,99,255,0.04),_transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Почему PLGames?
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">
            Сравните с другими решениями
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            {
              title: 'PLGames Booster',
              highlight: true,
              features: [
                { text: 'Кастомный PLG Protocol (UDP)', ok: true },
                { text: 'Multipath с дублированием', ok: true },
                { text: 'Автодетект игры', ok: true },
                { text: 'От 299 ₽/мес', ok: true },
                { text: 'Серверы в Европе', ok: true },
                { text: 'Open-source клиент', ok: true },
              ],
            },
            {
              title: 'Обычный VPN',
              highlight: false,
              features: [
                { text: 'TCP/UDP через туннель', ok: false },
                { text: 'Без multipath', ok: false },
                { text: 'Ручная настройка', ok: false },
                { text: 'От 300-600 ₽/мес', ok: false },
                { text: 'Много серверов', ok: true },
                { text: 'Закрытый код', ok: false },
              ],
            },
            {
              title: 'Без бустера',
              highlight: false,
              features: [
                { text: 'Маршрут провайдера', ok: false },
                { text: 'Нет защиты от потерь', ok: false },
                { text: 'Нет оптимизации', ok: false },
                { text: 'Бесплатно', ok: true },
                { text: 'Зависит от ISP', ok: false },
                { text: 'Нет гарантий', ok: false },
              ],
            },
          ].map((col) => (
            <div
              key={col.title}
              className={`bg-surface-card border rounded-2xl p-7 ${
                col.highlight ? 'border-brand' : 'border-surface-border'
              }`}
            >
              <h3 className={`text-lg font-semibold mb-5 ${col.highlight ? 'text-brand' : 'text-white'}`}>
                {col.title}
              </h3>
              <ul className="space-y-3">
                {col.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    {f.ok ? (
                      <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-400/60 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4.22 4.22a.75.75 0 011.06 0L8 6.94l2.72-2.72a.75.75 0 111.06 1.06L9.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 01-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 010-1.06z" />
                      </svg>
                    )}
                    {f.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
