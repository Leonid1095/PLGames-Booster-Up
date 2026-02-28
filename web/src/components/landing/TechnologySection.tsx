export function TechnologySection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,_rgba(108,99,255,0.06),_transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-xs text-brand-light mb-6">
              Технология
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 leading-tight">
              Интеллектуальная<br />маршрутизация трафика
            </h2>
            <p className="text-text-secondary text-lg mb-8 leading-relaxed">
              PLG Protocol анализирует маршруты в реальном времени и направляет
              игровой трафик по оптимальному пути. Без шифрования всего трафика,
              без подмены IP — только оптимизация маршрута до игрового сервера.
            </p>

            <div className="space-y-5">
              <Feature
                icon={<RouteIcon />}
                title="Adaptive Routing"
                desc="Автоматический выбор маршрута с минимальной задержкой из всех доступных узлов"
              />
              <Feature
                icon={<DualPathIcon />}
                title="Multipath"
                desc="Дублирование трафика по нескольким маршрутам — мгновенное переключение при сбое"
              />
              <Feature
                icon={<ShieldIcon />}
                title="Безопасно для игр"
                desc="Оптимизируем только игровой трафик. Античиты не видят наш клиент"
              />
            </div>
          </div>

          {/* Right: Visual diagram */}
          <div className="relative">
            <div className="bg-surface-card border border-surface-border rounded-2xl p-8 glow-brand">
              {/* Route visualization */}
              <div className="space-y-6">
                {/* Normal route */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-sm text-text-muted">Обычный маршрут</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <NodeBox label="Ты" color="text-text-secondary" />
                    <RouteLine hops={5} color="bg-red-400/40" />
                    <NodeBox label="Сервер" color="text-text-secondary" />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-red-400 text-2xl font-bold">87 мс</span>
                    <span className="text-xs text-text-muted">12 хопов, 3% потери</span>
                  </div>
                </div>

                <div className="border-t border-surface-border" />

                {/* Optimized route */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full bg-accent-green" />
                    <span className="text-sm text-accent-green">PLG Protocol</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <NodeBox label="Ты" color="text-brand-light" />
                    <RouteLine hops={2} color="bg-brand/60" highlight />
                    <NodeBox label="PLG" color="text-brand-light" glow />
                    <RouteLine hops={2} color="bg-accent-green/60" highlight />
                    <NodeBox label="Сервер" color="text-accent-green" />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-accent-green text-2xl font-bold">52 мс</span>
                    <span className="text-xs text-text-muted">4 хопа, 0% потери</span>
                  </div>
                </div>
              </div>

              {/* Ping improvement badge */}
              <div className="mt-6 bg-accent-green/5 border border-accent-green/20 rounded-xl p-4 text-center">
                <span className="text-accent-green font-bold text-lg">-40% пинг</span>
                <span className="text-text-muted text-sm ml-2">0% потери пакетов</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-text-secondary">{desc}</p>
      </div>
    </div>
  );
}

function NodeBox({ label, color, glow }: { label: string; color: string; glow?: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-lg border ${glow ? 'border-brand/40 bg-brand/10 glow-brand' : 'border-surface-border bg-surface-card-hover'} text-xs font-medium ${color} shrink-0`}>
      {label}
    </div>
  );
}

function RouteLine({ hops, color, highlight }: { hops: number; color: string; highlight?: boolean }) {
  return (
    <div className="flex-1 flex items-center gap-1">
      {Array.from({ length: hops }).map((_, i) => (
        <div key={i} className={`flex-1 h-0.5 rounded-full ${color} ${highlight ? 'animate-pulse-slow' : ''}`} />
      ))}
    </div>
  );
}

function RouteIcon() {
  return (
    <svg className="w-5 h-5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" />
      <path d="M6 9v3a3 3 0 003 3h6a3 3 0 003-3V9" />
    </svg>
  );
}

function DualPathIcon() {
  return (
    <svg className="w-5 h-5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-5 h-5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
