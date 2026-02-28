import type { GameProfile } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18000';

const fallbackGames: { name: string; category: string; slug: string; icon_url: string | null }[] = [
  { name: 'Counter-Strike 2', category: 'fps', slug: 'cs2', icon_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg' },
  { name: 'Dota 2', category: 'moba', slug: 'dota-2', icon_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg' },
  { name: 'Valorant', category: 'fps', slug: 'valorant', icon_url: null },
  { name: 'Apex Legends', category: 'fps', slug: 'apex-legends', icon_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg' },
  { name: 'Fortnite', category: 'battle_royale', slug: 'fortnite', icon_url: null },
  { name: 'League of Legends', category: 'moba', slug: 'league-of-legends', icon_url: null },
  { name: 'PUBG: Battlegrounds', category: 'battle_royale', slug: 'pubg', icon_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/578080/header.jpg' },
  { name: 'Overwatch 2', category: 'fps', slug: 'overwatch-2', icon_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2357570/header.jpg' },
  { name: 'Marvel Rivals', category: 'fps', slug: 'marvel-rivals', icon_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2767030/header.jpg' },
  { name: 'Dead by Daylight', category: 'survival', slug: 'dead-by-daylight', icon_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/381210/header.jpg' },
  { name: 'Rocket League', category: 'sports', slug: 'rocket-league', icon_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg' },
  { name: 'Escape from Tarkov', category: 'fps', slug: 'escape-from-tarkov', icon_url: null },
];

async function getGames(): Promise<{ name: string; category: string; slug: string; icon_url: string | null }[]> {
  try {
    const res = await fetch(`${API_URL}/api/games?popular=true`, { next: { revalidate: 3600 } });
    if (!res.ok) return fallbackGames;
    const data = await res.json();
    return data.items?.length > 0
      ? data.items.map((g: GameProfile) => ({ name: g.name, category: g.category, slug: g.slug, icon_url: g.icon_url }))
      : fallbackGames;
  } catch {
    return fallbackGames;
  }
}

const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  fps: { bg: 'bg-red-500/8', text: 'text-red-400', dot: 'bg-red-400' },
  moba: { bg: 'bg-blue-500/8', text: 'text-blue-400', dot: 'bg-blue-400' },
  battle_royale: { bg: 'bg-orange-500/8', text: 'text-orange-400', dot: 'bg-orange-400' },
  mmo: { bg: 'bg-green-500/8', text: 'text-green-400', dot: 'bg-green-400' },
  sports: { bg: 'bg-yellow-500/8', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  racing: { bg: 'bg-cyan-500/8', text: 'text-cyan-400', dot: 'bg-cyan-400' },
  survival: { bg: 'bg-emerald-500/8', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  strategy: { bg: 'bg-amber-500/8', text: 'text-amber-400', dot: 'bg-amber-400' },
  fighting: { bg: 'bg-pink-500/8', text: 'text-pink-400', dot: 'bg-pink-400' },
  card: { bg: 'bg-violet-500/8', text: 'text-violet-400', dot: 'bg-violet-400' },
};

const categoryLabels: Record<string, string> = {
  fps: 'FPS',
  moba: 'MOBA',
  battle_royale: 'Battle Royale',
  mmo: 'MMO/RPG',
  sports: 'Sports',
  racing: 'Racing',
  survival: 'Survival',
  strategy: 'Strategy',
  fighting: 'Fighting',
  card: 'Card',
};

const defaultColor = { bg: 'bg-surface-hover', text: 'text-text-muted', dot: 'bg-text-muted' };

export async function GamesSection() {
  const games = await getGames();

  return (
    <section id="games" className="py-24 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_50%,_rgba(108,99,255,0.04),_transparent)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Библиотека включает все хиты</h2>
          <p className="text-text-secondary max-w-xl mx-auto text-lg">
            Регулярно обновляемая библиотека — поддержка всех популярных онлайн-игр
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {games.map((game) => {
            const colors = categoryColors[game.category] || defaultColor;
            const label = categoryLabels[game.category] || game.category;
            return (
              <div
                key={game.slug}
                className="group bg-surface-card border border-surface-border rounded-xl overflow-hidden hover:border-brand/30 hover:bg-surface-card-hover transition-all duration-200"
              >
                {/* Game image or fallback */}
                <div className="relative w-full aspect-[460/215] bg-surface-hover overflow-hidden">
                  {game.icon_url ? (
                    <img
                      src={game.icon_url}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-brand/60 group-hover:text-brand transition-colors">
                      {game.name.charAt(0)}
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3 text-center">
                  <h3 className="text-sm font-medium text-white mb-2 truncate">{game.name}</h3>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <p className="text-text-muted">...и ещё десятки других игр</p>
        </div>
      </div>
    </section>
  );
}
