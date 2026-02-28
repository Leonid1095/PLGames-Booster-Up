const platforms = [
  {
    name: 'Windows',
    available: true,
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 12V6.75l8-1.25V12H3zm0 .5h8v6.5L3 17.75V12.5zM11.5 12V5.35l9.5-1.6V12H11.5zm0 .5h9.5v8.25l-9.5-1.6V12.5z" />
      </svg>
    ),
  },
  {
    name: 'Android',
    available: false,
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
      </svg>
    ),
  },
  {
    name: 'iOS',
    available: false,
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
  },
  {
    name: 'Роутер',
    available: false,
    icon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="2" y="14" width="20" height="6" rx="2" />
        <path d="M6 14V8a6 6 0 0112 0v6" />
        <circle cx="6" cy="17" r="1" fill="currentColor" />
        <circle cx="10" cy="17" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

export function PlatformsSection() {
  return (
    <section className="py-16 border-b border-surface-border/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {platforms.map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-2 group">
              <div className={`${p.available ? 'text-text-primary group-hover:text-brand' : 'text-text-muted/40'} transition-colors`}>
                {p.icon}
              </div>
              <span className={`text-sm ${p.available ? 'text-text-secondary' : 'text-text-muted/40'}`}>
                {p.name}
              </span>
              {!p.available && (
                <span className="text-[10px] text-text-muted/40 -mt-1">скоро</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
