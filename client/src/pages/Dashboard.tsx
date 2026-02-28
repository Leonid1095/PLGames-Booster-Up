import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import Titlebar from "../components/Titlebar";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import * as api from "../lib/api";
import type { User, GameProfile, NodeInfo, BoostStatus, SmartGameDetectedPayload, SmartAutoConnectedPayload, SmartBestNodePayload } from "../lib/types";
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
  const [smartNotification, setSmartNotification] = useState<string | null>(null);
  const [detectedGame, setDetectedGame] = useState<string | null>(null);
  const [activatingTrial, setActivatingTrial] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number>(0);
  const smartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Smart monitor event listeners
    const unlisteners: (() => void)[] = [];

    listen<SmartGameDetectedPayload>("smart:game-detected", (event) => {
      const { game, best_node, auto_connecting } = event.payload;
      setSelectedGame(game);
      sessionStorage.setItem("selectedGame", JSON.stringify(game));
      if (best_node) {
        setSelectedNode(best_node);
      }
      setDetectedGame(game.name);
      showSmartNotification(
        auto_connecting
          ? `Обнаружена ${game.name} — автоподключение...`
          : `Обнаружена ${game.name}`
      );
    }).then((u) => unlisteners.push(u));

    listen<SmartAutoConnectedPayload>("smart:auto-connected", (event) => {
      const { game_name, node_name } = event.payload;
      showSmartNotification(`${game_name} — подключен через ${node_name}`);
      // Refresh boost status
      api.getBoostStatus().then((s) => {
        if (s.connected) {
          setBoost(s);
          startPolling();
          startTimer();
        }
      });
    }).then((u) => unlisteners.push(u));

    listen("smart:game-closed", () => {
      setDetectedGame(null);
      showSmartNotification("Игра закрыта");
    }).then((u) => unlisteners.push(u));

    listen("smart:auto-disconnected", () => {
      showSmartNotification("Автоотключение — игра завершена");
      api.getBoostStatus().then((s) => {
        setBoost(s);
        if (!s.connected) {
          stopPolling();
          stopTimer();
        }
      });
    }).then((u) => unlisteners.push(u));

    listen<SmartBestNodePayload>("smart:best-node", (event) => {
      const { node, ping_ms } = event.payload;
      setSelectedNode(node);
      showSmartNotification(`Лучший узел: ${node.name} (${Math.round(ping_ms)} ms)`);
    }).then((u) => unlisteners.push(u));

    return () => {
      stopPolling();
      stopTimer();
      unlisteners.forEach((u) => u());
      if (smartTimerRef.current) clearTimeout(smartTimerRef.current);
    };
  }, [navigate]);

  const showSmartNotification = useCallback((msg: string) => {
    setSmartNotification(msg);
    if (smartTimerRef.current) clearTimeout(smartTimerRef.current);
    smartTimerRef.current = setTimeout(() => setSmartNotification(null), 5000);
  }, []);

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
      const msg = String(e);
      if (msg.includes("Active subscription required") || msg.includes("Subscription expired")) {
        setError("Для подключения нужна активная подписка. Активируйте пробный период (7 дней бесплатно) или оформите подписку.");
      } else {
        setError(msg);
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleActivateTrial = async () => {
    setActivatingTrial(true);
    setError("");
    try {
      const resp = await api.activateTrial();
      if (resp.is_active) {
        // Refresh user to update tier badge
        const updatedUser = await api.getUser();
        setUser(updatedUser);
        showSmartNotification(`Пробный период активирован! ${resp.days_remaining} дней`);
      }
    } catch (e) {
      const msg = String(e);
      if (msg.includes("already") || msg.includes("уже")) {
        setError("Пробный период уже был использован. Оформите подписку для доступа.");
      } else {
        setError(msg);
      }
    } finally {
      setActivatingTrial(false);
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
      {/* Smart notification toast */}
      {smartNotification && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-40 animate-slideDown">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand/90 text-white text-xs font-medium shadow-lg backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
            {smartNotification}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Detected game indicator */}
        {detectedGame && !isConnected && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-400">
              Обнаружена: {detectedGame}
            </span>
          </div>
        )}

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

        {/* Free tier banner */}
        {user.subscription_tier === "free" && !isConnected && (
          <Card className="!p-3 border-brand/30 bg-brand/5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg width="16" height="16" viewBox="0 0 16 16" className="text-brand">
                  <path d="M8 1L10.2 5.5L15 6.2L11.5 9.6L12.4 14.4L8 12.1L3.6 14.4L4.5 9.6L1 6.2L5.8 5.5L8 1Z" fill="currentColor" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary mb-0.5">
                  Активируйте пробный период
                </p>
                <p className="text-[10px] text-text-muted mb-2">
                  7 дней бесплатного доступа ко всем функциям: оптимизация маршрутов, multipath и автоподключение
                </p>
                <button
                  onClick={handleActivateTrial}
                  disabled={activatingTrial}
                  className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-light transition-colors disabled:opacity-50"
                >
                  {activatingTrial ? "Активация..." : "Попробовать бесплатно"}
                </button>
              </div>
            </div>
          </Card>
        )}

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
