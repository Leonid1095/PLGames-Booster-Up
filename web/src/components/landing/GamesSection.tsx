import type { GameProfile } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18000';

const fallbackGames = [
  { name: 'Counter-Strike 2', category: 'FPS', slug: 'cs2' },
  { name: 'Dota 2', category: 'MOBA', slug: 'dota2' },
  { name: 'Valorant', category: 'FPS', slug: 'valorant' },
  { name: 'Apex Legends', category: 'FPS', slug: 'apex-legends' },
  { name: 'Fortnite', category: 'Battle Royale', slug: 'fortnite' },
  { name: 'League of Legends', category: 'MOBA', slug: 'league-of-legends' },
  { name: 'PUBG', category: 'FPS', slug: 'pubg' },
  { name: 'Overwatch 2', category: 'FPS', slug: 'overwatch-2' },
  { name: 'Genshin Impact', category: 'RPG', slug: 'genshin-impact' },
  { name: 'World of Warcraft', category: 'MMO', slug: 'wow' },
  { name: 'Rocket League', category: 'Sport', slug: 'rocket-league' },
  { name: 'Escape from Tarkov', category: 'FPS', slug: 'tarkov' },
];

async function getGames(): Promise<{ name: string; category: string; slug: string }[]> {
  try {
    const res = await fetch(`${API_URL}/api/games?popular=true`, { next: { revalidate: 3600 } });
    if (!res.ok) return fallbackGames;
    const data = await res.json();
    return data.items?.length > 0
      ? data.items.map((g: GameProfile) => ({ name: g.name, category: g.category, slug: g.slug }))
      : fallbackGames;
  } catch {
    return fallbackGames;
  }
}

const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  FPS: { bg: 'bg-red-500/8', text: 'text-red-400', dot: 'bg-red-400' },
  MOBA: { bg: 'bg-blue-500/8', text: 'text-blue-400', dot: 'bg-blue-400' },
  'Battle Royale': { bg: 'bg-orange-500/8', text: 'text-orange-400', dot: 'bg-orange-400' },
  MMO: { bg: 'bg-green-500/8', text: 'text-green-400', dot: 'bg-green-400' },
  RPG: { bg: 'bg-purple-500/8', text: 'text-purple-400', dot: 'bg-purple-400' },
  Sport: { bg: 'bg-yellow-500/8', text: 'text-yellow-400', dot: 'bg-yellow-400' },
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
            return (
              <div
                key={game.slug}
                className="group bg-surface-card border border-surface-border rounded-xl p-4 text-center hover:border-brand/30 hover:bg-surface-card-hover transition-all duration-200"
              >
                <div className="w-14 h-14 rounded-xl bg-surface-hover mx-auto mb-3 flex items-center justify-center text-xl font-bold text-brand group-hover:bg-brand/10 transition-colors">
                  {game.name.charAt(0)}
                </div>
                <h3 className="text-sm font-medium text-white mb-2 truncate">{game.name}</h3>
                <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                  {game.category}
                </span>
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
