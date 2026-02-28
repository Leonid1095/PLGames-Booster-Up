// ── User ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  username: string;
  subscription_tier: string;
  subscription_expires_at: string | null;
  created_at: string;
}

export interface UserStats {
  total_sessions: number;
  total_bytes_sent: number;
  total_bytes_received: number;
  avg_ping: number | null;
  favorite_game: string | null;
}

// ── Games ───────────────────────────────────────────────────────────

export interface GameProfile {
  id: string;
  name: string;
  slug: string;
  exe_names: string[];
  server_ips: string[];
  ports: string[];
  protocol: string;
  category: string;
  is_popular: boolean;
  created_at: string;
}

export interface GameListResponse {
  items: GameProfile[];
  total: number;
}

// ── Nodes ───────────────────────────────────────────────────────────

export interface NodeInfo {
  id: string;
  name: string;
  location: string;
  city: string;
  ip_address: string;
  status: string;
  current_load: number;
  max_sessions: number;
  relay_port: number;
  created_at: string;
}

export interface NodePingResponse {
  node_id: string;
  ping_ms: number | null;
  status: string;
}

// ── Sessions ────────────────────────────────────────────────────────

export interface SessionStartResponse {
  session_id: string;
  session_token: number;
  node_ip: string;
  node_port: number;
  backup_node_ip: string | null;
  backup_node_port: number | null;
  multipath_enabled: boolean;
  status: string;
}

export interface SessionStopResponse {
  session_id: string;
  status: string;
  duration_seconds: number | null;
  bytes_sent: number;
  bytes_received: number;
}

export interface SessionHistoryItem {
  id: string;
  game_name: string;
  node_location: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  avg_ping: number | null;
  bytes_sent: number;
  bytes_received: number;
  multipath_enabled: boolean;
}

// ── Boost / Proxy ──────────────────────────────────────────────────

export interface ProxyStats {
  packets_sent: number;
  packets_received: number;
  bytes_sent: number;
  bytes_received: number;
  last_rtt_ms: number | null;
  multipath_enabled: boolean;
  multipath_active: boolean;
  duplicates_dropped: number;
}

export interface BoostStatus {
  connected: boolean;
  session_id: string | null;
  local_port: number | null;
  stats: ProxyStats | null;
  multipath_enabled: boolean;
}

// ── Settings ───────────────────────────────────────────────────────

export interface AppSettings {
  api_url: string;
  auto_start: boolean;
  auto_connect: boolean;
  multipath: boolean;
  preferred_node: string;
  minimize_to_tray: boolean;
}

// ── Subscription tiers ──────────────────────────────────────────────

export const TIER_NAMES: Record<string, string> = {
  free: "Бесплатный",
  trial: "Пробный",
  monthly: "Месячный",
  quarterly: "Квартальный",
  yearly: "Годовой",
};
