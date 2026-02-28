import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export function CtaSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,_rgba(108,99,255,0.12),_transparent)]" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Играй без лагов уже сейчас
        </h2>
        <p className="text-lg text-text-secondary mb-10 max-w-xl mx-auto">
          Скачай клиент, зарегистрируйся и получи 7 дней полного доступа бесплатно.
          Никаких данных карты.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/download">
            <Button className="text-base px-10 py-3.5 glow-brand">
              <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Скачать для Windows
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" className="text-base px-10 py-3.5">Создать аккаунт</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
