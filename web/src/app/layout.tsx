import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'PLGames Booster UP — Играй без лагов',
    template: '%s | PLGames Booster UP',
  },
  description:
    'Игровой бустер нового поколения. PLG Protocol снижает пинг и стабилизирует соединение для онлайн-игр.',
  keywords: ['игровой бустер', 'снижение пинга', 'PLG Protocol', 'онлайн игры', 'оптимизация маршрутов'],
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
