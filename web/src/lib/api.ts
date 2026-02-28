const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18000';

// --- Types ---

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

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
  icon_url: string | null;
  created_at: string;
}

export interface GameListResponse {
  items: GameProfile[];
  total: number;
}

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
}

export interface ApiError {
  detail: string;
}

// --- Token Management ---

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

// --- Fetch Wrapper ---

async function refreshTokens(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data: TokenResponse = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_URL}${path}`, { ...init, headers });

  // Auto-refresh on 401
  if (res.status === 401 && getRefreshToken()) {
    if (!refreshPromise) {
      refreshPromise = refreshTokens();
    }
    const refreshed = await refreshPromise;
    refreshPromise = null;

    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      res = await fetch(`${API_URL}${path}`, { ...init, headers });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Ошибка сервера' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// --- API Methods ---

export const api = {
  auth: {
    register(email: string, username: string, password: string) {
      return apiFetch<TokenResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, username, password }),
      });
    },
    login(email: string, password: string) {
      return apiFetch<TokenResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },
  },

  users: {
    me() {
      return apiFetch<User>('/api/me');
    },
    stats() {
      return apiFetch<UserStats>('/api/me/stats');
    },
  },

  games: {
    list(params?: { category?: string; popular?: boolean }) {
      const sp = new URLSearchParams();
      if (params?.category) sp.set('category', params.category);
      if (params?.popular !== undefined) sp.set('popular', String(params.popular));
      const qs = sp.toString();
      return apiFetch<GameListResponse>(`/api/games${qs ? `?${qs}` : ''}`);
    },
    search(q: string) {
      return apiFetch<GameListResponse>(`/api/games/search?q=${encodeURIComponent(q)}`);
    },
    get(slug: string) {
      return apiFetch<GameProfile>(`/api/games/${slug}`);
    },
  },

  nodes: {
    list() {
      return apiFetch<NodeInfo[]>('/api/nodes');
    },
  },

  sessions: {
    history() {
      return apiFetch<SessionHistoryItem[]>('/api/sessions/history');
    },
  },
};
