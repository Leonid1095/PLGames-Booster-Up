import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Titlebar from "../components/Titlebar";
import Input from "../components/ui/Input";
import * as api from "../lib/api";
import type { GameProfile } from "../lib/types";

export default function GameSelect() {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getGames()
      .then((resp) => setGames(resp.items))
      .catch((err) => console.error("Failed to load games:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (query.length === 0) {
      const resp = await api.getGames();
      setGames(resp.items);
    } else if (query.length >= 2) {
      const resp = await api.searchGames(query);
      setGames(resp.items);
    }
  };

  const selectGame = (game: GameProfile) => {
    // Store selected game and go back to dashboard
    sessionStorage.setItem("selectedGame", JSON.stringify(game));
    navigate("/dashboard");
  };

  return (
    <>
      <Titlebar />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-text-primary">
            Выбор игры
          </h1>
        </div>

        {/* Search */}
        <Input
          placeholder="Поиск игры..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Game list */}
        {!loading && games.length === 0 && (
          <p className="text-center text-text-muted py-8 text-sm">
            Игры не найдены
          </p>
        )}

        <div className="space-y-2">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => selectGame(game)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-card border border-surface-border hover:border-brand/50 hover:bg-surface-card-hover transition-all duration-200 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                <span className="text-brand text-xs font-bold">
                  {game.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm truncate">
                  {game.name}
                </p>
                <p className="text-xs text-text-muted">
                  {game.category.toUpperCase()} · {game.protocol}
                </p>
              </div>
              {game.is_popular && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green">
                  HOT
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
