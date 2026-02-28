import Link from 'next/link';

const columns = [
  {
    title: 'Продукт',
    links: [
      { label: 'Как это работает', href: '/#how-it-works' },
      { label: 'Тарифы', href: '/#pricing' },
      { label: 'Скачать клиент', href: '/download' },
    ],
  },
  {
    title: 'Игры',
    links: [
      { label: 'Каталог игр', href: '/#games' },
      { label: 'Counter-Strike 2', href: '/#games' },
      { label: 'Dota 2', href: '/#games' },
      { label: 'Valorant', href: '/#games' },
    ],
  },
  {
    title: 'Поддержка',
    links: [
      { label: 'FAQ', href: '/#faq' },
      { label: 'Telegram', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-surface-border/40 bg-surface-bg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 text-lg font-bold text-white mb-4">
              <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                  <path d="M2 2h6v14H2V2zm8 0h6v8h-6V2z" fill="white" />
                </svg>
              </div>
              PLGames
            </div>
            <p className="text-sm text-text-muted leading-relaxed mb-4">
              Игровой бустер с собственным PLG Protocol. Снижаем пинг, убираем джиттер.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-text-primary mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-text-muted hover:text-text-primary transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-surface-border/40 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-text-muted">&copy; {new Date().getFullYear()} PLGames. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
