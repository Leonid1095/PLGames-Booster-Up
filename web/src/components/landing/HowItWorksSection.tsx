const steps = [
  {
    num: '01',
    title: 'Скачай клиент',
    desc: 'Установи лёгкий клиент PLGames — менее 10 МБ, не нагружает систему.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
    ),
    color: 'from-brand/20 to-transparent',
    borderColor: 'group-hover:border-brand/50',
  },
  {
    num: '02',
    title: 'Выбери игру',
    desc: 'Клиент автоматически определяет запущенную игру или выбери из каталога.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M15 6v12a3 3 0 103-3H6a3 3 0 103 3V6a3 3 0 10-3 3h12a3 3 0 10-3-3" />
      </svg>
    ),
    color: 'from-accent-cyan/20 to-transparent',
    borderColor: 'group-hover:border-accent-cyan/50',
  },
  {
    num: '03',
    title: 'Играй без лагов',
    desc: 'PLG Protocol автоматически оптимизирует маршрут и стабилизирует соединение.',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    color: 'from-accent-green/20 to-transparent',
    borderColor: 'group-hover:border-accent-green/50',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Как это работает</h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">Три простых шага — и ты в игре с минимальным пингом</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className={`group relative bg-surface-card border border-surface-border rounded-2xl p-8 text-center transition-all duration-300 ${step.borderColor} hover:bg-surface-card-hover`}
            >
              {/* Top gradient */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${step.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-surface-hover text-brand mb-5">
                  {step.icon}
                </div>
                <div className="text-xs font-mono text-text-muted mb-3">Шаг {step.num}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
