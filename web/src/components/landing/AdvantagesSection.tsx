const advantages = [
  {
    title: 'PLG Protocol',
    desc: 'Собственный UDP-протокол для игрового трафика. Минимальный оверхед, максимальная скорость передачи данных.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    color: 'text-brand',
  },
  {
    title: 'Multipath маршрутизация',
    desc: 'Трафик дублируется по нескольким путям. При сбое — переключение мгновенное, без разрыва.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    color: 'text-accent-cyan',
  },
  {
    title: 'Автодетект игры',
    desc: 'Клиент определяет запущенную игру и применяет оптимальные настройки автоматически.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    color: 'text-accent-green',
  },
  {
    title: 'Снижение пинга до 40%',
    desc: 'Обход неоптимальных маршрутов провайдера. Прямой путь до игрового сервера.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    color: 'text-accent-green',
  },
  {
    title: '0% потери пакетов',
    desc: 'Стабильное соединение без потерь. Конец телепортам и фризам в самый важный момент.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    color: 'text-brand-light',
  },
  {
    title: '7 дней бесплатно',
    desc: 'Полный доступ без ограничений. Никаких данных карты при регистрации.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0z" />
      </svg>
    ),
    color: 'text-accent-cyan',
  },
];

export function AdvantagesSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Почему PLGames?</h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">
            Технология оптимизации маршрутов, созданная специально для онлайн-игр
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {advantages.map((a) => (
            <div
              key={a.title}
              className="group bg-surface-card border border-surface-border rounded-2xl p-6 hover:border-brand/30 hover:bg-surface-card-hover transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl bg-surface-hover flex items-center justify-center mb-4 ${a.color} group-hover:bg-brand/10 transition-colors`}>
                {a.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{a.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
