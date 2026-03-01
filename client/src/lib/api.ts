import { invoke } from "@tauri-apps/api/core";
import type {
  User,
  UserStats,
  GameListResponse,
  NodeInfo,
  NodePingResponse,
  SessionStartResponse,
  SessionStopResponse,
  SessionHistoryItem,
  BoostStatus,
} from "./types";

// ── Auth ────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<User> {
  return invoke("cmd_login", { email, password });
}

export async function register(
  email: string,
  username: string,
  password: string,
): Promise<User> {
  return invoke("cmd_register", { email, username, password });
}

export async function logout(): Promise<void> {
  return invoke("cmd_logout");
}

export async function getUser(): Promise<User> {
  return invoke("cmd_get_user");
}

export async function getUserStats(): Promise<UserStats> {
  return invoke("cmd_get_user_stats");
}

// ── Games ───────────────────────────────────────────────────────────

export async function getGames(
  category?: string,
  popular?: boolean,
): Promise<GameListResponse> {
  return invoke("cmd_get_games", { category, popular });
}

export async function searchGames(query: string): Promise<GameListResponse> {
  return invoke("cmd_search_games", { query });
}

// ── Nodes ───────────────────────────────────────────────────────────

export async function getNodes(): Promise<NodeInfo[]> {
  return invoke("cmd_get_nodes");
}

export async function pingNode(nodeId: string): Promise<NodePingResponse> {
  return invoke("cmd_ping_node", { nodeId });
}

// ── Sessions ────────────────────────────────────────────────────────

export async function startSession(
  gameSlug: string,
  nodeId: string,
  multipath?: boolean,
): Promise<SessionStartResponse> {
  return invoke("cmd_start_session", { gameSlug, nodeId, multipath });
}

export async function stopSession(
  sessionId: string,
): Promise<SessionStopResponse> {
  return invoke("cmd_stop_session", { sessionId });
}

export async function getSessionHistory(): Promise<SessionHistoryItem[]> {
  return invoke("cmd_get_session_history");
}

// ── Boost ───────────────────────────────────────────────────────────

export async function startBoost(
  gameSlug: string,
  nodeId: string,
  gameServerTarget?: string,
  localPort?: number,
  multipath?: boolean,
  useWindivert?: boolean,
): Promise<BoostStatus> {
  return invoke("cmd_start_boost", {
    gameSlug,
    nodeId,
    gameServerTarget,
    localPort,
    multipath,
    useWindivert,
  });
}

export async function stopBoost(): Promise<BoostStatus> {
  return invoke("cmd_stop_boost");
}

export async function getBoostStatus(): Promise<BoostStatus> {
  return invoke("cmd_get_boost_status");
}

// ── Game Detector ───────────────────────────────────────────────────

export async function detectGame(): Promise<import("./types").GameProfile | null> {
  return invoke("cmd_detect_game");
}

// ── Settings ────────────────────────────────────────────────────────

export async function getSettings(): Promise<import("./types").AppSettings> {
  return invoke("cmd_get_settings");
}

export async function updateSetting(
  key: string,
  value: string,
): Promise<import("./types").AppSettings> {
  return invoke("cmd_update_settings", { key, value });
}

// ── Billing ─────────────────────────────────────────────────────────

export async function activateTrial(): Promise<import("./types").TrialResponse> {
  return invoke("cmd_activate_trial");
}

// ── Admin Check ────────────────────────────────────────────────────

export async function checkAdmin(): Promise<boolean> {
  return invoke("cmd_check_admin");
}

// ── Utils ───────────────────────────────────────────────────────────

export async function getAppVersion(): Promise<string> {
  return invoke("get_app_version");
}

export async function quit(): Promise<void> {
  return invoke("cmd_quit");
}
