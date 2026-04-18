const nodes = [
  { location: 'Франкфурт', country: 'Германия', flag: '🇩🇪', status: 'active' as const },
  { location: 'Стокгольм', country: 'Швеция', flag: '🇸🇪', status: 'active' as const },
  { location: 'Рига', country: 'Латвия', flag: '🇱🇻', status: 'active' as const },
  { location: 'Нью-Йорк', country: 'США', flag: '🇺🇸', status: 'active' as const },
];

export function GlobalCoverageSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,_rgba(0,212,255,0.04),_transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Серверы</h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">
            4 relay-узла в Европе и США — автоматический выбор ближайшего для минимального пинга
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {nodes.map((node) => (
            <div
              key={node.location}
              className="bg-surface-card border border-surface-border rounded-2xl p-6 hover:border-brand/30 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">{node.flag}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-accent-green">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                  online
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{node.location}</h3>
              <p className="text-sm text-text-muted">{node.country}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-surface-card border border-surface-border rounded-2xl p-8 text-center">
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div>
              <div className="text-2xl font-bold text-white">4</div>
              <div className="text-xs text-text-muted mt-1">узла</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">2</div>
              <div className="text-xs text-text-muted mt-1">континента</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">UDP</div>
              <div className="text-xs text-text-muted mt-1">PLG Protocol</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
