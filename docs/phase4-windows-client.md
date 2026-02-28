# Phase 4: Windows GUI-клиент (Tauri)

> Этот документ — полная инструкция для разработки на **локальной Windows-машине**.
> Клиент подключается к удалённому серверу PLGames.

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

```
┌─────────┬───────┬─────────┬─────────────┐
│ Version │ Flags │ Token   │ Payload     │
│ 1 byte  │ 1 byte│ 4 bytes │ N bytes     │
└─────────┴───────┴─────────┴─────────────┘
```

### Поля:
- **Version**: `0x01` (всегда)
- **Flags**:
  - `0x00` = обычные данные (DATA)
  - `0x04` = управляющий пакет (CONTROL)
- **Token**: `session_token` из `/api/sessions/start` (u32, big-endian)
- **Payload**: данные

### Последовательность работы:

1. Клиент вызывает `POST /api/sessions/start` → получает `session_token` + `node_ip` + `node_port`
2. Клиент открывает UDP-сокет
3. Клиент отправляет **control-пакет** на `node_ip:node_port`:
   ```
   [0x01] [0x04] [token: 4 bytes] [payload: "game_server_ip:port"]
   ```
   Payload — строка `"1.2.3.4:27015"` (IP:port игрового сервера)
4. Relay запоминает: этот токен → пересылать на game_server_ip:port
5. Далее клиент шлёт **data-пакеты**:
   ```
   [0x01] [0x00] [token: 4 bytes] [game UDP payload]
   ```
6. Relay пересылает payload на game server, ответы от game server шлёт обратно клиенту

### Multipath (опционально):

Если `multipath_enabled=true` в ответе `/api/sessions/start`:
- Дублировать отправку на оба relay: `node_ip:node_port` и `backup_node_ip:backup_node_port`
- Принимать ответ от того, кто ответит первым
- При потере связи с primary — автоматически работать через backup

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
import socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
# PLG control packet: version=1, flags=4(control), token=0, payload="1.2.3.4:27015"
packet = b'\x01\x04\x00\x00\x00\x00' + b'1.2.3.4:27015'
# IP-адрес узла получите из GET /api/nodes
sock.sendto(packet, ('NODE_IP_FROM_API', 443))
```
(Нужна активная сессия через API для реального теста)

---

## Важно

- API сервер доступен по HTTPS: `https://plgames-boost.duckdns.org/api/*`
- Для Tauri CORS не проблема — Rust делает HTTP-запросы напрямую, не из браузера
- IP-адреса relay-узлов получайте динамически из `GET /api/nodes` — не хардкодьте
- Подписка: все новые пользователи получают `trial` тариф (7 дней бесплатно)
- `POST /api/sessions/start` требует активную подписку (иначе 403)
- Multipath опционален — работает в single-path если backup-узел недоступен
