import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

const BASE_URL = 'https://plgames-boost.duckdns.org';

export const metadata: Metadata = {
  title: {
    default: 'PLGames Booster UP — Играй без лагов',
    template: '%s | PLGames Booster UP',
  },
  description:
    'Игровой бустер нового поколения. PLG Protocol снижает пинг на 40% и стабилизирует соединение для CS2, Dota 2, Valorant и 50+ онлайн-игр. Бесплатный пробный период 7 дней.',
  keywords: [
    'игровой бустер', 'снижение пинга', 'PLG Protocol', 'онлайн игры',
    'оптимизация маршрутов', 'game booster', 'ping reducer', 'CS2', 'Dota 2',
    'Valorant', 'VPN для игр', 'снизить лаги',
  ],
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/icon-192.png',
  },
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: BASE_URL,
    siteName: 'PLGames Booster UP',
    title: 'PLGames Booster UP — Играй без лагов',
    description: 'Снижаем пинг на 40% в CS2, Dota 2, Valorant и 50+ играх. PLG Protocol — кастомный UDP-протокол для геймеров. 7 дней бесплатно.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PLGames Booster UP — Играй без лагов',
    description: 'Снижаем пинг на 40% в CS2, Dota 2, Valorant и 50+ играх. 7 дней бесплатно.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
