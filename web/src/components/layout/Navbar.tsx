'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-surface-border/40 bg-surface-bg/70 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold text-white">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 2h6v14H2V2zm8 0h6v8h-6V2z" fill="white" />
              </svg>
            </div>
            <span>PLGames</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/#games">Игры</NavLink>
            <NavLink href="/#pricing">Тарифы</NavLink>
            <NavLink href="/download">Скачать</NavLink>
            <a href="https://github.com/Leonid1095/PLGames-Booster-Up" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-white px-2 py-2 rounded-lg hover:bg-surface-hover/50 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-sm">{user.username}</Button>
                </Link>
                <Button variant="outline" className="text-sm" onClick={logout}>Выйти</Button>
              </>
            ) : (
              <>
                <Link href="/login"><Button variant="ghost" className="text-sm">Войти</Button></Link>
                <Link href="/register"><Button className="text-sm">Попробовать бесплатно</Button></Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 text-text-secondary" onClick={() => setMenuOpen(!menuOpen)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={cn('md:hidden overflow-hidden transition-all duration-200', menuOpen ? 'max-h-72 pb-4' : 'max-h-0')}>
          <div className="flex flex-col gap-1 pt-2">
            <MobileLink href="/#games" onClick={() => setMenuOpen(false)}>Игры</MobileLink>
            <MobileLink href="/#pricing" onClick={() => setMenuOpen(false)}>Тарифы</MobileLink>
            <MobileLink href="/download" onClick={() => setMenuOpen(false)}>Скачать</MobileLink>
            <div className="border-t border-surface-border/40 my-2" />
            {user ? (
              <>
                <MobileLink href="/dashboard" onClick={() => setMenuOpen(false)}>Личный кабинет</MobileLink>
                <button className="text-sm text-text-secondary py-2 px-3 text-left hover:text-white transition-colors" onClick={() => { logout(); setMenuOpen(false); }}>Выйти</button>
              </>
            ) : (
              <>
                <MobileLink href="/login" onClick={() => setMenuOpen(false)}>Войти</MobileLink>
                <MobileLink href="/register" onClick={() => setMenuOpen(false)} highlight>Попробовать бесплатно</MobileLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-text-secondary hover:text-white px-3 py-2 rounded-lg hover:bg-surface-hover/50 transition-all">
      {children}
    </Link>
  );
}

function MobileLink({ href, children, onClick, highlight }: { href: string; children: React.ReactNode; onClick?: () => void; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className={cn('text-sm py-2 px-3 rounded-lg transition-colors', highlight ? 'text-brand font-medium' : 'text-text-secondary hover:text-white')}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
