import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const stats = [
  { value: '-40%', label: 'снижение пинга', accent: 'text-accent-green' },
  { value: '<15 мс', label: 'до сервера', accent: 'text-accent-cyan' },
  { value: '50+', label: 'поддерживаемых игр', accent: 'text-brand-light' },
  { value: '99.9%', label: 'аптайм сети', accent: 'text-accent-green' },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,_rgba(108,99,255,0.18),_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_50%,_rgba(0,212,255,0.06),_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_20%_80%,_rgba(108,99,255,0.06),_transparent_50%)]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(108,99,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(108,99,255,0.4) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand/5 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-cyan/5 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center pt-28 pb-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-5 py-2 text-sm text-brand-light mb-8 backdrop-blur-sm">
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute h-2 w-2 rounded-full bg-accent-green opacity-75" />
            <span className="relative rounded-full h-2 w-2 bg-accent-green" />
          </span>
          Оптимизация маршрутов для игр
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[1.1] mb-6 tracking-tight">
          Снижаем пинг<br />
          <span className="text-gradient">во всех играх</span>
        </h1>

        <p className="mx-auto max-w-2xl text-lg sm:text-xl text-text-secondary mb-12 leading-relaxed">
          Умная маршрутизация игрового трафика. Снижаем задержку,
          убираем джиттер и потерю пакетов. На любом устройстве.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link href="/download">
            <Button className="text-base px-10 py-3.5 glow-brand">
              <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Скачать бесплатно
            </Button>
          </Link>
          <Link href="/#how-it-works">
            <Button variant="outline" className="text-base px-10 py-3.5">Как это работает</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {stats.map((s) => (
            <div key={s.label} className="relative group">
              <div className="bg-surface-card/50 backdrop-blur-sm border border-surface-border/50 rounded-2xl p-5 text-center transition-all duration-300 hover:border-brand/30 hover:bg-surface-card/80">
                <div className={`text-2xl sm:text-3xl font-bold ${s.accent} mb-1`}>{s.value}</div>
                <div className="text-xs sm:text-sm text-text-muted">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface-bg to-transparent" />
    </section>
  );
}
