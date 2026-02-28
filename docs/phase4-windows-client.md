# Phase 4: Windows GUI-клиент (Tauri)

> Этот документ — полная инструкция для разработки на **локальной Windows-машине**.
> Клиент подключается к удалённому серверу PLGames.

---

## Дорожная карта разработки клиента

> Статусы: `[ ]` не начато, `[~]` в работе, `[x]` готово

### Этап 0: Подготовка окружения
- [x] 0.1 Проверить/установить Rust (rustup) — Rust 1.92.0
- [x] 0.2 Проверить/установить Node.js 20+ — Node 22.17.1
- [x] 0.3 Проверить WebView2 (Windows 11 — есть из коробки)
- [x] 0.4 Проверить доступность API: `{"status":"ok","version":"0.1.0"}`
- [x] 0.5 Scaffold Tauri 2 + React + TypeScript проект в `client/`
- [x] 0.6 Настроить Tailwind CSS с темой из web (цвета, шрифты)
- [x] 0.7 `cargo check` + `tsc --noEmit` — без ошибок

### Этап 1: Rust Backend — Config + Auth
- [x] 1.1 `config.rs` — AppConfig, чтение/запись `%APPDATA%/PLGames/config.json`
- [x] 1.2 `auth.rs` — AuthTokens, чтение/запись `%APPDATA%/PLGames/auth.json`
- [x] 1.3 `api_client.rs` — HTTP клиент (reqwest): login, register, refresh, get_me, auto-refresh при 401
- [x] 1.4 `commands.rs` — Tauri IPC: cmd_login, cmd_register, cmd_logout, cmd_get_user
- [x] 1.5 Тесты: 4 unit-теста (config + auth serialization)

### Этап 2: React UI — Auth
- [x] 2.1 Настроить react-router-dom (Login, Register, Dashboard, Games, Settings)
- [x] 2.2 `lib/api.ts` — обёртки над Tauri invoke
- [x] 2.3 `lib/types.ts` — TypeScript типы (из web)
- [x] 2.4 `components/ui/` — Button, Input, Card (стили из web)
- [x] 2.5 `pages/Login.tsx` — форма email + password
- [x] 2.6 `pages/Register.tsx` — форма email + username + password
- [x] 2.7 Кастомный titlebar (Tauri `decorations: false`) — `Titlebar.tsx`
- [x] 2.8 TypeScript компиляция без ошибок

### Этап 3: Rust Backend — Games + Nodes
- [x] 3.1 `api_client.rs` — get_games, search_games, get_nodes, ping_node
- [x] 3.3 `commands.rs` — cmd_get_games, cmd_search_games, cmd_get_nodes, cmd_ping_node
- [ ] 3.2 `games_cache.rs` — кеш игр в `games_cache.json` (TTL 1 час) — отложено

### Этап 4: React UI — Games + Nodes
- [x] 4.1 `pages/Dashboard.tsx` — статус, кнопка ВКЛ/ВЫКЛ, текущая игра + узел + навигация
- [x] 4.2 `pages/GameSelect.tsx` — список игр с поиском
- [x] 4.3 NodeSelector — встроен в Dashboard (select с узлами)
- [x] 4.4 `pages/Settings.tsx` — заглушка настроек + о программе

### Этап 5: Rust Backend — Game Detector
- [x] 5.1 `game_detector.rs` — сканирование процессов Windows (sysinfo 0.33), матчинг с exe_names
- [x] 5.2 `commands.rs` — cmd_detect_game
- [x] 5.4 Тесты: 3 unit-теста (detect none, no match, list processes)
- [ ] 5.3 Событие Tauri `game-detected` → фронтенд popup — отложено

### Этап 6: Rust Backend — PLG Protocol + UDP Proxy (КРИТИЧЕСКИЙ)
- [x] 6.1 `protocol.rs` — PLG Protocol (реальный формат 10 байт)
- [x] 6.2 `udp_proxy.rs` — локальный UDP прокси с shared game_addr
- [x] 6.4 `commands.rs` — cmd_start_boost, cmd_stop_boost, cmd_get_boost_status
- [x] 6.5 Keepalive: heartbeat (флаг 0x02) каждые 30 сек
- [x] 6.6 Тесты: 8 unit-тестов PLG Protocol (encode/decode, big-endian, flags, edge cases)

**Всего тестов: 15 passed, 0 failed**

### Этап 7: Multipath
- [x] 7.1 Дублирование UDP на backup relay при multipath=true
- [x] 7.2 Дедупликация ответов по seq_number (HashSet, auto-clear >10k)
- [x] 7.3 Keepalive на оба relay, RTT-замер через keepalive echo
- [x] 7.4 ProxyStats расширен: multipath_enabled, multipath_active, duplicates_dropped
- [x] 7.5 commands.rs: backup_relay_addr парсинг, передача multipath_enabled

### Этап 8: UI — Dashboard + Статистика
- [x] 8.1 TypeScript: BoostStatus, ProxyStats типы + api обёртки startBoost/stopBoost/getBoostStatus
- [x] 8.2 Dashboard: подключение/отключение, live polling (2 сек), таймер сессии
- [x] 8.3 SVG sparkline-график пинга (30 точек)
- [x] 8.4 Live-статистика: bytes sent/received, packets, multipath ON/OFF, duplicates dropped
- [x] 8.5 Индикатор статуса: круг OFF→зелёный с RTT ms, glow-эффект

### Этап 9: System Tray + Settings
- [x] 9.1 `tray.rs` — иконка в трее, контекст-меню (Открыть/Выход), двойной клик → показать окно
- [x] 9.2 `pages/Settings.tsx` — рабочие переключатели: автозапуск, авто-подключение, multipath, трей
- [x] 9.3 Автозапуск с Windows (HKCU\...\Run через reg.exe)
- [x] 9.4 IPC: cmd_get_settings, cmd_update_settings → config.json

### Этап 10: Финализация + Билд
- [x] 10.1 Все 15 unit-тестов проходят (protocol 8, auth 2, config 2, game_detector 3)
- [x] 10.2 TypeScript компиляция — 0 ошибок
- [x] 10.3 Tauri bundler: .msi + .exe (NSIS) — успешно
- [x] 10.4 Размеры: EXE 15 MB, NSIS setup 3.6 MB, MSI 5.2 MB — ВСЕ < 20 MB

### Зависимости этапов
```
Этап 0 → Этап 1 → Этап 2
              ↓
         Этап 3 → Этап 4
              ↓
         Этап 5
              ↓
         Этап 6 (КРИТИЧЕСКИЙ — ядро клиента)
              ↓
         Этап 7 → Этап 8
                       ↓
                  Этап 9 → Этап 10
```

---

## Что нужно сделать

Создать десктопный Windows-клиент (Tauri 2 + React + TypeScript) для игрового бустера PLGames.
Клиент должен:
1. Авторизовать пользователя через API сервера
2. Показывать список игр и relay-узлов
3. Автоматически определять запущенную игру (по exe-процессу)
4. Создавать relay-сессию через API
5. Перенаправлять игровой UDP-трафик через PLG Relay (UDP-протокол)
6. Показывать статистику (пинг, трафик, время сессии)
7. Сворачиваться в системный трей

---

## Архитектура

```
┌──────────────────────────────────────────────────┐
│  Windows Client (Tauri 2)                        │
│                                                  │
│  ┌─────────────┐  ┌───────────────────────────┐  │
│  │ React UI    │  │ Rust Backend (Tauri)       │  │
│  │ (WebView)   │◄─►                            │  │
│  │             │  │ - Game detector (процессы) │  │
│  │ - Login     │  │ - UDP proxy (local↔relay)  │  │
│  │ - Dashboard │  │ - Tray icon                │  │
│  │ - Settings  │  │ - Auto-updater             │  │
│  └─────────────┘  └──────────┬────────────────┘  │
└──────────────────────────────┼────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Remote Server      │
                    │  plgames-boost.     │
                    │  duckdns.org        │
                    │                     │
                    │  API: HTTPS (:443)  │
                    │  Relay: UDP (:443)  │
                    └─────────────────────┘
```

---

## Удалённый сервер (уже работает)

| Компонент | Адрес | Протокол |
|-----------|-------|----------|
| **API** | `https://plgames-boost.duckdns.org` | HTTPS REST |
| **PLG Relay** | `plgames-boost.duckdns.org:443` | UDP (PLG Protocol) |
| **Web** | `https://plgames-boost.duckdns.org` | HTTPS (лендинг + кабинет) |

> API доступен по пути `/api/*`, например `https://plgames-boost.duckdns.org/api/health`
> Relay работает по UDP на порту 443 (UDP и TCP на одном порту не конфликтуют)

---

## API Endpoints (полный список)

Base URL: `https://plgames-boost.duckdns.org`

### Авторизация (без токена)

```
POST /api/auth/register
  Body: { "email": "str", "username": "str (3-50)", "password": "str (8-128)" }
  Response 201: { "access_token": "str", "refresh_token": "str", "token_type": "bearer" }

POST /api/auth/login
  Body: { "email": "str", "password": "str" }
  Response 200: { "access_token": "str", "refresh_token": "str", "token_type": "bearer" }

POST /api/auth/refresh
  Body: { "refresh_token": "str" }
  Response 200: { "access_token": "str", "refresh_token": "str", "token_type": "bearer" }
```

### Пользователь (требует `Authorization: Bearer <access_token>`)

```
GET /api/me
  Response: {
    "id": "uuid", "email": "str", "username": "str",
    "subscription_tier": "trial|basic|pro",
    "subscription_expires_at": "datetime|null",
    "created_at": "datetime"
  }

GET /api/me/stats
  Response: {
    "total_sessions": int, "total_bytes_sent": int, "total_bytes_received": int,
    "avg_ping": float|null, "favorite_game": "str|null"
  }
```

### Игры (без токена)

```
GET /api/games?category=FPS&popular=true
  Response: {
    "items": [{
      "id": "uuid", "name": "str", "slug": "str",
      "exe_names": ["cs2.exe", "csgo.exe"],  // <-- ЭТО ВАЖНО для автодетекта!
      "server_ips": ["str"], "ports": ["str"], "protocol": "UDP|TCP",
      "category": "str", "is_popular": bool, "created_at": "datetime"
    }],
    "total": int
  }

GET /api/games/search?q=counter
GET /api/games/{slug}
```

### Relay-узлы (без токена)

```
GET /api/nodes
  Response: [{
    "id": "uuid", "name": "str", "location": "DE", "city": "Frankfurt",
    "ip_address": "str", "status": "active",
    "current_load": int, "max_sessions": int,
    "relay_port": 443, "created_at": "datetime"
  }]
```

> IP-адрес узла получайте из ответа `/api/nodes` — не хардкодьте!

### Сессии (требует токен + активную подписку)

```
POST /api/sessions/start
  Body: {
    "game_slug": "cs2",
    "node_id": "uuid",
    "multipath": false          // опционально, по умолчанию false
  }
  Response 201: {
    "session_id": "uuid",
    "session_token": 123456789,  // <-- 32-bit токен для PLG Protocol!
    "node_ip": "str",
    "node_port": 443,
    "backup_node_ip": "str|null",      // если multipath=true и есть backup
    "backup_node_port": int|null,      // порт backup-узла
    "multipath_enabled": false,        // реально ли включен multipath
    "status": "active"
  }

POST /api/sessions/{session_id}/stop
  Response: {
    "session_id": "uuid", "status": "stopped",
    "duration_seconds": int|null,
    "bytes_sent": int, "bytes_received": int
  }

GET /api/sessions/history
  Response: [{
    "id": "uuid", "game_name": "str", "node_location": "str",
    "status": "str", "started_at": "datetime|null", "ended_at": "datetime|null",
    "avg_ping": float|null, "bytes_sent": int, "bytes_received": int,
    "multipath_enabled": false
  }]
```

### JWT Token Flow

- `access_token` живёт **15 минут**
- `refresh_token` живёт **7 дней**
- При получении 401 — вызвать `/api/auth/refresh`, получить новую пару
- Хранить токены в файле: `%APPDATA%/PLGames/auth.json`

---

## PLG Protocol (UDP)

Клиент общается с relay-сервером по UDP. Формат пакета:

> **ВНИМАНИЕ**: Формат ниже соответствует реальному коду relay-сервера (`relay/src/protocol.rs`).

```
┌──────────┬──────────┬───────┬─────────┬─────────────┐
│ Token    │ SeqNum   │ Flags │ PathID  │ Payload     │
│ 4 bytes  │ 4 bytes  │ 1 byte│ 1 byte  │ N bytes     │
│ (BE u32) │ (BE u32) │       │         │             │
└──────────┴──────────┴───────┴─────────┴─────────────┘
```

**Заголовок: 10 байт** (HEADER_SIZE = 10)

### Поля:
- **Token** (offset 0, 4 bytes): `session_token` из `/api/sessions/start` (u32, big-endian)
- **SeqNum** (offset 4, 4 bytes): порядковый номер пакета (u32, big-endian). Используется для дедупликации при multipath
- **Flags** (offset 8, 1 byte):
  - `0x00` = обычные данные (DATA)
  - `0x01` = MULTIPATH_DUP — пакет дублирован на несколько путей
  - `0x02` = KEEPALIVE — heartbeat, relay не пересылает
  - `0x04` = CONTROL — управляющий пакет (установка forward target)
  - `0x08` = COMPRESSED — payload сжат (зарезервировано)
- **PathID** (offset 9, 1 byte): ID пути (`0` = primary, `1` = backup)
- **Payload** (offset 10+): данные

### Последовательность работы:

1. Клиент вызывает `POST /api/sessions/start` → получает `session_token` + `node_ip` + `node_port`
2. Клиент открывает UDP-сокет
3. Клиент отправляет **control-пакет** на `node_ip:node_port`:
   ```
   [token: 4B] [seq: 4B] [0x04] [0x00] [payload: "game_server_ip:port"]
   ```
   Payload — UTF-8 строка `"1.2.3.4:27015"` (IP:port игрового сервера).
   Relay валидирует IP по списку `game_server_ips` из зарегистрированной сессии.
4. Relay запоминает: этот токен → пересылать на game_server_ip:port
5. Далее клиент шлёт **data-пакеты**:
   ```
   [token: 4B] [seq: 4B] [0x00] [0x00] [game UDP payload]
   ```
6. Relay пересылает payload на game server, ответы от game server шлёт обратно клиенту
   (ответ обёрнут в PLG header: seq=0, flags=0, path_id=0)
7. Клиент отправляет **keepalive** каждые 30 сек:
   ```
   [token: 4B] [seq: 4B] [0x02] [0x00] []
   ```
   Relay обновляет `last_seen`, не пересылает

### Multipath (опционально):

Если `multipath_enabled=true` в ответе `/api/sessions/start`:
- Дублировать отправку на оба relay: `node_ip:node_port` и `backup_node_ip:backup_node_port`
- Устанавливать флаг `0x01` (MULTIPATH_DUP) и path_id (`0` для primary, `1` для backup)
- Принимать ответ от того, кто ответит первым
- Дедупликация по seq_number — второй ответ отбрасывается
- При потере связи с primary — автоматически работать через backup

### Таймауты relay:
- Сессия удаляется через **300 секунд** без пакетов (SESSION_TIMEOUT)
- Cleanup каждые 60 секунд
- Keepalive каждые 30 сек предотвращает удаление

### Как работает локальный прокси:

```
Игра ──UDP──► localhost:LOCAL_PORT ──PLG Protocol──► Relay:443 ──UDP──► Game Server
Игра ◄──UDP── localhost:LOCAL_PORT ◄──PLG Protocol── Relay:443 ◄──UDP── Game Server
```

Клиент поднимает локальный UDP-сокет (например `127.0.0.1:27015`), игра подключается к нему вместо реального сервера. Клиент оборачивает каждый UDP-пакет в PLG Protocol и отправляет на relay.

---

## Автодетект игр

1. Загрузить список игр: `GET /api/games` (кешировать на 1 час)
2. Каждые 3-5 секунд сканировать запущенные процессы Windows
3. Сравнивать имена процессов с полем `exe_names` из профилей игр
4. При совпадении — предложить пользователю включить буст (или включить автоматически)

Rust-код для сканирования процессов (Windows):
```rust
use sysinfo::{ProcessExt, System, SystemExt};

fn detect_game(system: &mut System, exe_names: &[Vec<String>]) -> Option<String> {
    system.refresh_processes();
    for (_, process) in system.processes() {
        let name = process.name().to_lowercase();
        for game_exes in exe_names {
            if game_exes.iter().any(|exe| name == exe.to_lowercase()) {
                return Some(name);
            }
        }
    }
    None
}
```

---

## Структура проекта (рекомендуемая)

```
client/
├── src-tauri/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs           # Tauri app entry
│   │   ├── commands.rs        # Tauri IPC commands
│   │   ├── auth.rs            # Token storage + refresh
│   │   ├── api_client.rs      # HTTP client to server API
│   │   ├── game_detector.rs   # Process scanning
│   │   ├── udp_proxy.rs       # Local UDP proxy + PLG Protocol
│   │   ├── protocol.rs        # PLG packet encode/decode
│   │   ├── tray.rs            # System tray
│   │   └── config.rs          # App settings
│   └── tauri.conf.json
├── src/                       # React frontend
│   ├── App.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── GameSelect.tsx
│   │   └── Settings.tsx
│   ├── components/
│   └── lib/
│       ├── api.ts             # Tauri invoke wrappers
│       └── types.ts
├── package.json
└── index.html
```

---

## UI Экраны

### 1. Логин
- Email + пароль
- Кнопка регистрации
- "Запомнить меня" → сохранять refresh_token в файл

### 2. Главный экран (Dashboard)
- Статус: Отключен / Подключен / Подключение...
- Большая кнопка ВКЛ/ВЫКЛ
- Текущая игра (автодетект или ручной выбор)
- Выбранный узел (автовыбор по пингу или ручной)
- Статистика: пинг, время сессии, трафик
- Индикатор multipath (если включён)

### 3. Выбор игры
- Список из API с поиском
- Отметка "автоопределение"

### 4. Настройки
- Автозапуск с Windows
- Автоподключение при запуске игры
- Multipath вкл/выкл
- Выбор узла (авто / ручной)
- Сменить пароль (заглушка)
- О программе + версия

---

## Конфигурация приложения

Файлы хранить в `%APPDATA%/PLGames/`:

```
%APPDATA%/PLGames/
├── auth.json          # { "access_token": "...", "refresh_token": "..." }
├── config.json        # { "auto_start": false, "auto_connect": true, "preferred_node": "auto" }
└── games_cache.json   # Кеш списка игр
```

### config defaults:
```json
{
  "api_url": "https://plgames-boost.duckdns.org",
  "auto_start": false,
  "auto_connect": true,
  "multipath": false,
  "preferred_node": "auto",
  "minimize_to_tray": true
}
```

---

## Дизайн

Использовать тот же стиль что и веб:
- **Background**: `#0A0A14`
- **Cards**: `#12121F`
- **Card hover**: `#1A1A2E`
- **Borders**: `#1E1E32`
- **Brand/Accent**: `#6C63FF` (основной), `#8B83FF` (светлый), `#5A52E0` (тёмный)
- **Accent Cyan**: `#00D4FF`
- **Accent Green**: `#00FF94` (для индикаторов "онлайн", снижения пинга)
- **Text primary**: `#E8E8F0`
- **Text secondary**: `#9999AA`
- **Text muted**: `#666680`
- **Font**: Inter

Компактное окно ~400x600px, без рамки (Tauri `decorations: false`), кастомный titlebar.

---

## Зависимости (Cargo.toml)

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon", "devtools"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json"] }
tokio = { version = "1", features = ["full"] }
sysinfo = "0.31"
directories = "5"  # для %APPDATA%
```

---

## Порядок разработки

1. **Scaffold**: `npm create tauri-app@latest client -- --template react-ts`
2. **Auth**: login/register через API, хранение токенов
3. **Game list**: загрузка и отображение игр из API
4. **Node selection**: загрузка узлов, выбор лучшего по пингу
5. **Game detector**: сканирование процессов, матчинг с exe_names
6. **UDP proxy**: локальный сокет + PLG Protocol + relay connection
7. **Multipath**: дублирование трафика на backup relay (если включён)
8. **UI**: статус, статистика, tray
9. **Auto-updater**: Tauri built-in updater (позже)

---

## Тестирование подключения

Для проверки что сервер доступен:
```
curl https://plgames-boost.duckdns.org/api/health
# Ожидаемый ответ: {"status":"ok","version":"0.1.0"}
```

Для проверки UDP relay (из PowerShell/Python):
```python
import socket, struct
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# PLG control packet (реальный формат 10 байт):
# token=SESSION_TOKEN (u32 BE), seq=1 (u32 BE), flags=0x04 (CONTROL), path_id=0
session_token = 123456789  # получить из POST /api/sessions/start
payload = b'1.2.3.4:27015'
packet = struct.pack('>II', session_token, 1) + b'\x04\x00' + payload

# IP-адрес узла получите из GET /api/nodes
sock.sendto(packet, ('NODE_IP_FROM_API', 443))
```
(Нужна активная сессия через API для реального теста)

### Стратегия тестирования

| Уровень | Что тестируем | Инструмент |
|---------|--------------|------------|
| **Unit (Rust)** | PLG encode/decode, config R/W, auth tokens, exe_names matching | `cargo test` |
| **Integration** | API health, auth flow, games/nodes fetch, session lifecycle | `cargo test` + real API |
| **E2E** | login → detect game → connect → UDP через relay → disconnect | Manual + scripts |
| **UI** | Формы, валидация, отображение данных | Browser DevTools |

---

## Важно

- API сервер доступен по HTTPS: `https://plgames-boost.duckdns.org/api/*`
- Для Tauri CORS не проблема — Rust делает HTTP-запросы напрямую, не из браузера
- IP-адреса relay-узлов получайте динамически из `GET /api/nodes` — не хардкодьте
- Подписка: все новые пользователи получают `trial` тариф (7 дней бесплатно)
- `POST /api/sessions/start` требует активную подписку (иначе 403)
- Multipath опционален — работает в single-path если backup-узел недоступен
