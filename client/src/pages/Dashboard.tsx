import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Titlebar from "../components/Titlebar";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import * as api from "../lib/api";
import type { User, GameProfile, NodeInfo, BoostStatus } from "../lib/types";
import { TIER_NAMES } from "../lib/types";
import { formatBytes } from "../lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<GameProfile | null>(null);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [boost, setBoost] = useState<BoostStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [sessionTime, setSessionTime] = useState(0);
  const [pingHistory, setPingHistory] = useState<number[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number>(0);

  useEffect(() => {
    api
      .getUser()
      .then(setUser)
      .catch(() => navigate("/login"))
      .finally(() => setLoading(false));

    api.getNodes().then((n) => {
      setNodes(n);
      if (n.length > 0) setSelectedNode(n[0]);
    });

    const saved = sessionStorage.getItem("selectedGame");
    if (saved) {
      try {
        setSelectedGame(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }

    // Check if already connected
    api.getBoostStatus().then((s) => {
      if (s.connected) {
        setBoost(s);
        startPolling();
        startTimer();
      }
    });

    return () => {
      stopPolling();
      stopTimer();
    };
  }, [navigate]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const s = await api.getBoostStatus();
        setBoost(s);
        if (s.stats?.last_rtt_ms != null) {
          setPingHistory((prev) => {
            const next = [...prev, s.stats!.last_rtt_ms!];
            return next.length > 30 ? next.slice(-30) : next;
          });
        }
        if (!s.connected) {
          stopPolling();
          stopTimer();
        }
      } catch {
        /* ignore */
      }
    }, 2000);
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startTimer = () => {
    sessionStartRef.current = Date.now();
    setSessionTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setSessionTime(0);
  };

  const handleConnect = async () => {
    if (!selectedGame || !selectedNode) return;
    setError("");
    setConnecting(true);
    try {
      // Use first server_ip + first port as target, or fallback
      const target =
        selectedGame.server_ips.length > 0 && selectedGame.ports.length > 0
          ? `${selectedGame.server_ips[0]}:${selectedGame.ports[0]}`
          : "0.0.0.0:0";
      const localPort = parseInt(selectedGame.ports[0]) || 27015;

      const status = await api.startBoost(
        selectedGame.slug,
        selectedNode.id,
        target,
        localPort,
      );
      setBoost(status);
      setPingHistory([]);
      startPolling();
      startTimer();
    } catch (e) {
      setError(String(e));
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    try {
      const status = await api.stopBoost();
      setBoost(status);
      setPingHistory([]);
      stopPolling();
      stopTimer();
    } catch (e) {
      setError(String(e));
    } finally {
      setConnecting(false);
    }
  };

  const handleLogout = async () => {
    if (boost?.connected) {
      await api.stopBoost();
    }
    await api.logout();
    navigate("/login");
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <>
        <Titlebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!user) return null;

  const isConnected = boost?.connected === true;
  const stats = boost?.stats;
  const currentPing = stats?.last_rtt_ms;

  return (
    <>
      <Titlebar />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* User info */}
        <Card className="!p-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm text-text-primary">
                {user.username}
              </h2>
              <p className="text-xs text-text-muted">{user.email}</p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand/20 text-brand">
              {TIER_NAMES[user.subscription_tier] || user.subscription_tier}
            </span>
          </div>
        </Card>

        {/* Connection status circle */}
        <Card className="text-center !p-4">
          <div
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center mx-auto mb-2 transition-colors ${
              isConnected
                ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                : "border-surface-border"
            }`}
          >
            {isConnected ? (
              <div className="text-center">
                <span className="text-lg font-bold text-green-400">
                  {currentPing != null ? `${Math.round(currentPing)}` : "--"}
                </span>
                <span className="text-[10px] text-green-400/70 block -mt-0.5">ms</span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-text-muted">OFF</span>
            )}
          </div>
          <p className={`text-sm mb-0.5 ${isConnected ? "text-green-400" : "text-text-secondary"}`}>
            {isConnected ? "Подключен" : "Отключен"}
          </p>
          {isConnected && (
            <p className="text-xs text-text-muted">{formatTime(sessionTime)}</p>
          )}
        </Card>

        {/* Live stats (when connected) */}
        {isConnected && stats && (
          <Card className="!p-3">
            {/* Ping sparkline */}
            {pingHistory.length > 1 && (
              <div className="mb-3">
                <p className="text-[10px] text-text-muted mb-1 uppercase tracking-wider">Пинг</p>
                <svg viewBox={`0 0 ${pingHistory.length - 1} 40`} className="w-full h-8" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#6C63FF"
                    strokeWidth="1.5"
                    points={pingHistory
                      .map((p, i) => {
                        const max = Math.max(...pingHistory, 1);
                        const y = 40 - (p / max) * 36 - 2;
                        return `${i},${y}`;
                      })
                      .join(" ")}
                  />
                </svg>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-surface-bg rounded-lg px-2 py-1.5">
                <p className="text-text-muted text-[10px]">Отправлено</p>
                <p className="text-text-primary font-mono">
                  {formatBytes(stats.bytes_sent)}
                </p>
              </div>
              <div className="bg-surface-bg rounded-lg px-2 py-1.5">
                <p className="text-text-muted text-[10px]">Получено</p>
                <p className="text-text-primary font-mono">
                  {formatBytes(stats.bytes_received)}
                </p>
              </div>
              <div className="bg-surface-bg rounded-lg px-2 py-1.5">
                <p className="text-text-muted text-[10px]">Пакетов</p>
                <p className="text-text-primary font-mono">
                  {stats.packets_sent} / {stats.packets_received}
                </p>
              </div>
              <div className="bg-surface-bg rounded-lg px-2 py-1.5">
                <p className="text-text-muted text-[10px]">Multipath</p>
                <p className={`font-mono ${stats.multipath_enabled ? "text-green-400" : "text-text-muted"}`}>
                  {stats.multipath_enabled ? "ON" : "OFF"}
                  {stats.multipath_enabled && stats.duplicates_dropped > 0 && (
                    <span className="text-text-muted ml-1">(-{stats.duplicates_dropped})</span>
                  )}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Game selection (disabled when connected) */}
        {!isConnected && (
          <>
            <button
              onClick={() => navigate("/games")}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-card border border-surface-border hover:border-brand/50 transition-all text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                {selectedGame ? (
                  <span className="text-brand text-xs font-bold">
                    {selectedGame.name.substring(0, 2).toUpperCase()}
                  </span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-brand">
                    <path
                      d="M6 2C3.791 2 2 3.791 2 6s1.791 4 4 4a3.98 3.98 0 002.828-1.172L13.414 13.414a1 1 0 001.414-1.414L10.242 7.414A3.98 3.98 0 0010 6c0-2.209-1.791-4-4-4z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {selectedGame ? selectedGame.name : "Выбрать игру"}
                </p>
                <p className="text-xs text-text-muted">
                  {selectedGame
                    ? `${selectedGame.category.toUpperCase()} · ${selectedGame.protocol}`
                    : "Нажмите для выбора"}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" className="text-text-muted shrink-0">
                <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </button>

            {/* Node selection */}
            <div className="p-3 rounded-xl bg-surface-card border border-surface-border">
              <p className="text-xs text-text-muted mb-2">Relay-узел</p>
              {nodes.length === 0 ? (
                <p className="text-sm text-text-secondary">Загрузка узлов...</p>
              ) : (
                <select
                  value={selectedNode?.id || ""}
                  onChange={(e) => {
                    const node = nodes.find((n) => n.id === e.target.value);
                    if (node) setSelectedNode(node);
                  }}
                  className="w-full bg-surface-bg border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand"
                >
                  {nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name} · {node.city}, {node.location}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Connect / Disconnect button */}
        {isConnected ? (
          <Button
            className="w-full !py-3"
            variant="outline"
            onClick={handleDisconnect}
            loading={connecting}
          >
            Отключить
          </Button>
        ) : (
          <Button
            className="w-full !py-3"
            disabled={!selectedGame || !selectedNode}
            onClick={handleConnect}
            loading={connecting}
          >
            Подключить
          </Button>
        )}

        {/* Bottom nav */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => navigate("/settings")}
            className="flex-1 text-xs"
          >
            Настройки
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="flex-1 text-xs"
          >
            Выйти
          </Button>
        </div>
      </div>
    </>
  );
}
