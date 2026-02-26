# PLGames Booster UP — Финальная спецификация проекта

> Архитектура на уровне GearUP Booster / ExitLag.
> Кастомный UDP relay протокол + WireGuard fallback.

---

## 1. Продукт и цель

**Сервис:** PLGames Booster UP — игровой сетевой ускоритель.

**Публичное позиционирование:** Ускоритель для онлайн-игр. Оптимизация маршрута, снижение пинга, стабильное соединение. **Не VPN. Не средство обхода.** Мы оптимизируем игровой маршрут — как GearUP, как ExitLag.

**Как работает на самом деле:** Трафик идёт через наши узлы в EU/US. Побочный эффект — доступ к любым серверам. Но мы это не афишируем.

### Цели продукта:

1. Снизить пинг и потери пакетов за счёт маршрутизации через оптимальные узлы
2. Мультипутевая маршрутизация с дупликацией пакетов (как GearUP AIR)
3. Удобный десктоп-клиент: выбор игры, региона, пинг в реальном времени
4. Benchmark: честная метрика ДО и ПОСЛЕ ускорения
5. Прозрачный биллинг через DonatePay

### Целевая аудитория:
- Геймеры из РФ/СНГ, 16–35 лет
- Играющие на EU/US серверах
- Ищущие стабильный пинг и доступ к любым серверам

### Платформа MVP:
- **Серверы:** Ubuntu 24.04, узлы в DE, SE, US, LV
- **Клиент:** Windows x64
- **Позже (v2):** Android, Telegram-бот

---

## 2. Архитектура

### 2.1. Транспортный протокол: PLG Protocol

**Основной транспорт — кастомный UDP relay (как GearUP/ExitLag), не VPN.**

```
┌─── КЛИЕНТ (Windows) ──────────────────────────────────────┐
│                                                             │
│  WinDivert: перехват пакетов к игровым IP/портам            │
│       ↓                                                     │
│  PLG Protocol обёртка:                                      │
│  ┌───────────────────────────────────────────┐              │
│  │ Session ID   (4 bytes)                    │              │
│  │ Seq Number   (4 bytes)                    │              │
│  │ Flags        (1 byte)                     │              │
│  │ Path ID      (1 byte)                     │              │
│  │ ─────────────────────────────────────────  │              │
│  │ Оригинальный игровой UDP-пакет (payload)  │              │
│  └───────────────────────────────────────────┘              │
│  Overhead: 10 bytes. Без шифрования.                        │
│       ↓                                                     │
│  Отправка → узел(ы), порт 443/UDP                           │
│                                                             │
│  Multipath: один пакет → 2 узла одновременно                │
│  Первый ответ принимается, дубликат отбрасывается           │
└─────────────────────────────────────────────────────────────┘
         │                          │
    UDP :443                   UDP :443
    (DPI видит обычный UDP)    (как QUIC — легитимно)
         │                          │
         ▼                          ▼
┌─────────────┐            ┌─────────────┐
│  Узел DE    │            │  Узел SE    │
│  (основной) │            │  (резерв)   │
│             │            │             │
│  Снять      │            │  Снять      │
│  обёртку →  │            │  обёртку →  │
│  Forward →  │            │  Forward →  │
│  NAT →      │            │  NAT →      │
│  Game Server│            │  Game Server│
└──────┬──────┘            └─────────────┘
       │
       ▼
   Игровой сервер
       │ ответ
       ▼
   Узел → обёртка → клиент
```

**Почему порт 443/UDP:** QUIC (HTTP/3) использует тот же порт. DPI видит обычный UDP на 443 — Google, YouTube, Cloudflare так делают. Не палится.

**Почему без шифрования:** GearUP и ExitLag не шифруют — работают в РФ без блокировок. DPI ищет VPN-сигнатуры (WG handshake, OpenVPN header), а не абстрактный UDP. Шифрование = overhead = задержка. Для ускорителя это anti-pattern.

### PLG Protocol — формат пакета

```
 Offset  Size   Field
 0       4      Session ID (уникален на сессию)
 4       4      Sequence Number (для дедупликации)
 8       1      Flags:
                  0x01 = multipath duplicate
                  0x02 = keepalive
                  0x04 = control message
                  0x08 = compressed
 9       1      Path ID (0 = primary, 1 = backup)
 10      N      Payload (оригинальный игровой пакет)

Total overhead: 10 bytes
Сравнение: WireGuard = ~60 bytes, GearUP = ~12-16 bytes
```

### WireGuard — fallback (не основной)

В настройках клиента: опция **"Защищённый режим"**
- Включает WireGuard + obfs4 обёртку
- Для случаев когда основной протокол не работает
- Или пользователь хочет шифрование
- Overhead выше (+1-3ms), но трафик зашифрован

```
Порядок подключения:
1. PLG Protocol (443/UDP) → основной, быстрый
2. Если fail → WireGuard + obfs4 (fallback)
```

### 2.2. Компоненты системы

```
┌─────────────────────────────────────────────────────────────┐
│                    ПОЛЬЗОВАТЕЛЬ                              │
│  Windows-клиент (Tauri + React)                             │
│  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ UI/React│ │ WinDivert │ │PLG Proto │ │WG fallback   │  │
│  │         │ │ intercept │ │ UDP relay│ │(опционально) │  │
│  └────┬────┘ └─────┬─────┘ └────┬─────┘ └──────┬────────┘  │
└───────┼────────────┼────────────┼───────────────┼───────────┘
        │ API        │ game pkts  │ relay         │ WG tunnel
        ▼            ▼            ▼               ▼
┌───────────────────────────────────────────────────────────────┐
│              ЦЕНТРАЛЬНЫЙ СЕРВЕР (DE)                           │
│  ┌────────┐ ┌────────┐ ┌──────┐ ┌─────┐ ┌────────────────┐  │
│  │FastAPI │ │Next.js │ │Postgr│ │Redis│ │Prometheus+Graf │  │
│  │  API   │ │Landing │ │  SQL │ │     │ │                │  │
│  └────────┘ └────────┘ └──────┘ └─────┘ └────────────────┘  │
└───────────────────────────────────────────────────────────────┘
        │
        ▼ Управление сессиями и метриками
┌────────────────────────────────────────────────────────────────┐
│              GATEWAY NODES (PLG Relay + WG fallback)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ DE (FRA) │  │ SE (STO) │  │ US (NYC) │  │ LV (RIX) │      │
│  │ relay+wg │  │ relay+wg │  │ relay+wg │  │ relay+wg │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │NAT          │NAT          │NAT          │NAT          │
└───────┼─────────────┼─────────────┼─────────────┼─────────────┘
        ▼             ▼             ▼             ▼
     Игровые серверы (Steam, Riot, Blizzard, EA, etc.)
```

#### A. Landing-сайт
- Домен: **TBD** (будет куплен позже)
- Одностраничник: описание сервиса, тарифы, скачивание
- Регистрация/личный кабинет → бэкенд API
- Мини speed-test на лендинге (пинг до наших узлов через WebSocket)
- **Блок "Наши проекты"** — ссылки на другие проекты команды
- **Поддержка** — ссылка на наш проект поддержки (TBD)

#### B. Бэкенд-API
REST/JSON API:
- Регистрация/логин (email + пароль)
- OAuth: Telegram, Discord, Steam
- Список узлов и метрики в реальном времени
- Игровые профили (IP/CIDR + порты)
- Управление relay-сессиями (выдача session_id, node assignment)
- WireGuard конфиг-генератор (для fallback режима)
- Benchmark API
- Интеграция с DonatePay (webhook)

#### C. Gateway Nodes
- VPS Ubuntu 24 в регионах: DE, SE, US, LV
- **PLG Relay Server** — основной: приём UDP, снятие обёртки, forward
- **WireGuard Server** — fallback: для "защищённого режима"
- NAT (MASQUERADE)
- Health-check агент + push метрик в Prometheus

#### D. Десктоп-клиент Windows
- Tauri 2.x + React (лёгкий, ~10-15 MB)
- WinDivert для перехвата игровых пакетов
- PLG Protocol (Rust) — обёртка + отправка на узлы
- Multipath + дедупликация
- WireGuard fallback (wireguard-nt)
- Авто-детект запущенных игр

#### E. Админ-панель
- Пользователи, подписки, сессии
- Управление узлами
- Редактор игровых профилей
- Grafana embed

---

## 3. Инфраструктура

### 3.1. Центральный сервер (DE)
- Ubuntu 24.04, 2 vCPU, 4 GB RAM, 40 GB SSD
- Docker Compose
- Сервисы:
  - `api` — FastAPI (Python 3.12+)
  - `web` — Next.js (лендинг + кабинет)
  - `db` — PostgreSQL 16
  - `redis` — кэш метрик и сессий
  - `prometheus` + `grafana` — мониторинг

### 3.2. Gateway Nodes

| Узел | Локация | Назначение | Spec |
|------|---------|------------|------|
| DE | Франкфурт | Основной, EU-игры | 2 vCPU, 4 GB RAM |
| SE | Стокгольм | Скандинавия, низкий пинг из СПб | 1 vCPU, 2 GB RAM |
| US | Нью-Йорк | NA-серверы игр | 2 vCPU, 2 GB RAM |
| LV | Рига | Ближайший к РФ | 1 vCPU, 2 GB RAM |

Открытые порты на каждом:
- **UDP 443** — PLG Relay (основной, маскируется под QUIC)
- **UDP 51820** — WireGuard (fallback)
- **TCP 8443** — health-check агент (закрыт извне, только для API-сервера)

### 3.3. Сетевая конфигурация узла

```bash
# NAT — весь форвард через eth0
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# SYSCTL
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1

# Оптимизации UDP для гейминга
net.core.rmem_max=26214400
net.core.wmem_max=26214400
net.core.rmem_default=1048576
net.core.wmem_default=1048576

# Быстрый conntrack для UDP
net.netfilter.nf_conntrack_udp_timeout=30
net.netfilter.nf_conntrack_udp_timeout_stream=60

# BBR congestion control
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
```

### 3.4. WireGuard (fallback)

```bash
# Только для "защищённого режима"
# Интерфейс wg0: 10.10.X.1/24 (X уникален на каждом узле)
# DE=1, SE=2, US=3, LV=4
# Отдельный peer на каждого пользователя
```

---

## 4. Бэкенд: логика и API

### 4.1. Стек
- **Язык:** Python 3.12+ (FastAPI)
- **БД:** PostgreSQL 16
- **Кэш:** Redis 7
- **Auth:** JWT (access 15min + refresh 7d)
- **Миграции:** Alembic
- **Task queue:** Celery + Redis
- **Оплата:** DonatePay (webhook API)

### 4.2. Основные сущности

```python
class User:
    id: UUID
    email: str
    password_hash: str
    telegram_id: int | None
    discord_id: str | None
    steam_id: str | None
    plan: Enum  # free, trial, pro
    plan_expires_at: datetime | None
    referral_code: str
    referred_by: UUID | None
    created_at: datetime

class Node:
    id: UUID
    location: str       # DE, SE, US, LV
    city: str           # Frankfurt, Stockholm, etc.
    public_ip: str
    relay_port: int     # 443 (PLG Relay)
    wg_port: int        # 51820 (fallback)
    wg_public_key: str
    status: Enum        # online, offline, maintenance
    priority: int
    max_clients: int
    current_clients: int
    avg_rtt_ms: float

class GameProfile:
    id: UUID
    name: str
    slug: str
    icon_url: str
    cover_url: str
    category: Enum      # fps, moba, mmo, br, racing, other
    platform: Enum      # pc, mobile, both
    cidrs: list[str]    # IP/CIDR игровых серверов
    ports: list[PortRange]  # UDP/TCP порты для перехвата
    executable_names: list[str]  # процессы Windows для авто-детекта
    recommended_node: str | None
    is_verified: bool

class Session:
    id: UUID
    user_id: UUID
    node_id: UUID
    game_id: UUID
    transport: Enum     # plg_relay, wireguard
    multipath_enabled: bool
    start_time: datetime
    end_time: datetime | None
    avg_ping_ms: float | None
    avg_loss_pct: float | None
    ping_before_ms: float | None
    ping_after_ms: float | None
    bytes_transferred: int

class Subscription:
    id: UUID
    user_id: UUID
    plan: Enum          # trial, monthly, quarterly, yearly
    status: Enum        # active, expired, cancelled
    started_at: datetime
    expires_at: datetime
    payment_provider: str  # donatepay
    donatepay_id: str | None
    auto_renew: bool
```

### 4.3. API-эндпоинты

#### Auth
```
POST /api/v1/auth/register
POST /api/v1/auth/login         → JWT tokens
POST /api/v1/auth/refresh
POST /api/v1/auth/telegram      → OAuth
POST /api/v1/auth/discord       → OAuth
```

#### Игры и узлы
```
GET  /api/v1/games              → список игр
GET  /api/v1/games/{slug}       → детали + CIDR + порты
GET  /api/v1/games/search?q=    → поиск
GET  /api/v1/nodes              → список узлов с метриками
GET  /api/v1/nodes/{id}/ping    → текущий пинг
```

#### Сессии
```
POST /api/v1/sessions/start
  Request:  { game_id, preferred_region, transport: "plg_relay"|"wireguard" }
  Response: {
    session_id,
    node: { ip, relay_port, wg_config? },
    game_ips: [...],
    multipath_node?: { ip, relay_port }
  }

POST /api/v1/sessions/stop
  Request:  { session_id, metrics }

GET  /api/v1/sessions/active
GET  /api/v1/sessions/history
```

#### Пользователь
```
GET  /api/v1/me
GET  /api/v1/me/subscription
POST /api/v1/me/subscription/cancel
GET  /api/v1/me/stats
```

#### Benchmark
```
POST /api/v1/benchmark/start
POST /api/v1/benchmark/result
```

#### Платежи (DonatePay)
```
POST /api/v1/payments/create    → генерация ссылки DonatePay
POST /api/v1/payments/webhook   → webhook от DonatePay
GET  /api/v1/payments/history
```

---

## 5. Gateway Nodes: работа

### 5.1. PLG Relay Server (основной)

Бинарник на каждом узле (Rust или Go):

```
1. Слушает UDP :443
2. Получает пакет от клиента
3. Парсит PLG header (10 bytes)
4. Валидирует session_id (кэш в памяти, синхронизация с API)
5. Извлекает оригинальный игровой пакет
6. Отправляет через raw socket / NAT на игровой сервер
7. Получает ответ от игрового сервера
8. Оборачивает в PLG header
9. Отправляет обратно клиенту
```

**Производительность:** ~100K пакетов/сек на 1 vCPU (UDP forwarding — тривиальная операция).

### 5.2. Мониторинг узлов

Агент на каждом узле:
- Каждые 30 сек пингует игровые серверы из GameProfile
- Prometheus метрики:
  - `plg_node_game_rtt_ms{game, node}`
  - `plg_node_game_loss_pct{game, node}`
  - `plg_node_active_sessions{node}`
  - `plg_node_bandwidth_mbps{node, direction}`
- Alert при loss > 5% или RTT > 100ms → Telegram

### 5.3. Выбор лучшего узла

```python
def select_best_node(game_id, preferred_region=None):
    nodes = get_online_nodes()
    game = get_game_profile(game_id)

    scored = []
    for node in nodes:
        score = 0
        avg_rtt = get_node_game_rtt(node.id, game.id)
        score += (200 - avg_rtt) * 0.5          # пинг (50%)
        load = node.current_clients / node.max_clients
        score += (1 - load) * 100 * 0.2          # загрузка (20%)
        loss = get_node_game_loss(node.id, game.id)
        score += (100 - loss * 100) * 0.2        # потери (20%)
        if preferred_region == node.location:
            score += 10                           # предпочтение (10%)
        if game.recommended_node == node.location:
            score += 5
        scored.append((node, score))

    best = max(scored, key=lambda x: x[1])[0]

    # Выбор backup-узла для multipath (второй по score, другая локация)
    backup = None
    for node, s in sorted(scored, key=lambda x: -x[1]):
        if node.id != best.id:
            backup = node
            break

    return best, backup
```

---

## 6. Клиент Windows

### 6.1. Технологии

- **Оболочка:** Tauri 2.x + React + TypeScript + Tailwind CSS
- **Перехват трафика:** WinDivert (C library, Rust FFI)
- **PLG Protocol:** Rust — обёртка/распаковка, UDP socket, multipath
- **WG fallback:** wireguard-nt через Rust FFI
- **Авто-детект:** Windows Process API через Rust

### 6.2. Экраны

#### 1. Авторизация
- Email/пароль, Telegram, Discord
- Статус подписки, остаток trial

#### 2. Dashboard (главный)
- Пинг до ближайшего узла
- Последние игры (быстрый доступ)
- "Quick Boost" кнопка
- Статус подписки

#### 3. Выбор игры
- Поиск, категории (FPS, MOBA, MMO, BR, Racing)
- Карточки с иконками и бейджами "Оптимизировано"
- Секция "Скоро"

#### 4. Подключение (для игры)
- Регионы/узлы:
  - Авто (рекомендованный)
  - DE, SE, US, LV
  - Пинг + загруженность (цвет)
- "Играть с ускорением"
- "Benchmark" — замер ДО/ПОСЛЕ
- Авто-запуск .exe

#### 5. Активная сессия
- Крупный пинг (зелёный < 50ms, жёлтый 50-100, красный > 100)
- Потери (%), Jitter (ms)
- График пинга (10 мин)
- Маршрут: `Ты → Узел (DE) → Сервер игры`
- Сравнение: "Без ускорения: 85ms → С ускорением: 32ms"
- "Остановить ускорение"

#### 6. Настройки
- Автозапуск с Windows
- Язык: RU / EN
- Тема: тёмная (default) / светлая
- **Защищённый режим** (WireGuard fallback)
- Логи
- О программе

#### 7. Подписка
- Текущий план + дата
- Тарифы
- Оплата через DonatePay
- Отмена одной кнопкой
- История платежей

### 6.3. Логика работы

```
1. Запуск → проверка auth → загрузка игр + узлов из API

2. Выбор игры → регион → "Играть с ускорением"

3. POST /sessions/start → получаем:
   - session_id
   - primary node (ip, port)
   - backup node для multipath (ip, port)
   - game_ips (куда перехватывать трафик)

4. WinDivert: ставим фильтр на game_ips + game_ports
   Перехватываем исходящие UDP-пакеты

5. Каждый перехваченный пакет:
   → PLG header (session_id, seq++, flags, path_id=0)
   → отправка на primary node :443/UDP
   → если multipath: копия с path_id=1 на backup node

6. Входящие пакеты от узлов:
   → парсим PLG header
   → дедупликация по seq_number
   → извлекаем payload
   → WinDivert inject обратно в сетевой стек

7. Замер пинга: RTT до узла каждые 5 сек (keepalive пакеты с timestamps)

8. Мониторинг процесса игры:
   → если игра закрыта → popup "Остановить ускорение?"

9. Остановка:
   → снимаем WinDivert фильтр
   → POST /sessions/stop с метриками
```

### 6.4. Авто-детект игр

```
Каждые 10 сек: EnumProcesses() через Windows API
Сопоставляем с GameProfile.executable_names[]
Найдена игра → popup "Обнаружена CS2. Подключить ускорение?"
Авто-режим → автоматический старт сессии
```

---

## 7. Landing-страница

### 7.1. Технология
- Next.js 14+ (App Router)
- Tailwind CSS
- i18n: RU (основной) / EN
- SEO: "игровой ускоритель", "снизить пинг в играх", "PLGames Booster"

### 7.2. Блоки

#### Hero
- Заголовок: **"Стабильный пинг в любой игре"**
- Подзаголовок: "Игровой ускоритель с узлами в Европе и США. Оптимальный маршрут для вашего трафика — без потерь и задержек."
- Кнопки: "Скачать для Windows", "Попробовать бесплатно"
- Мини speed-test: пинг до наших узлов в реальном времени

#### Как это работает
- Схема: `Твой ПК → Наш узел → Игровой сервер`
- 3 шага:
  1. Выбираешь игру и регион
  2. Мы строим оптимальный маршрут для игрового трафика
  3. Играешь со стабильным пингом

#### Benchmark-секция
- "Средний результат наших пользователей:"
  - Пинг: 95ms → 32ms (-66%)
  - Потери: 3.2% → 0.1%

#### Поддерживаемые игры
- Сетка логотипов: CS2, Dota 2, Valorant, LoL, Fortnite, PUBG, Apex, Genshin Impact...
- "Оптимизировано для 50+ игр, работает с любыми онлайн-играми"

#### Преимущества
1. Низкий пинг (оптимальный маршрут через наши узлы)
2. Мультипутевая маршрутизация (дупликация пакетов, как у GearUP)
3. Не нагружает систему (лёгкий клиент ~15 MB)
4. Только игровой трафик (split-tunnel)
5. Прозрачный биллинг (отмена в 1 клик)
6. Бесплатный пробный период

#### Тарифы

| | Free Trial | Pro Monthly | Pro Quarterly | Pro Yearly |
|---|---|---|---|---|
| Цена | $0 | $5.99/мес | $4.99/мес | $3.99/мес |
| Длительность | 7 дней | 1 мес | 3 мес | 12 мес |
| Все узлы | Да | Да | Да | Да |
| Multipath | Нет | Да | Да | Да |
| Одновременных устройств | 1 | 2 | 2 | 3 |
| Приоритетная поддержка | Нет | Нет | Да | Да |

**Оплата: DonatePay** (карты, СБП, другие методы через DonatePay)

#### FAQ
1. "Это VPN?" → Нет, мы оптимизируем маршрут только для игрового трафика. Остальной интернет не затрагивается.
2. "За это банят?" → Ускоритель не модифицирует игру. Это оптимизация сети, а не чит.
3. "Какие платформы?" → Windows сейчас, Android скоро.
4. "Как отменить подписку?" → В личном кабинете одной кнопкой.

#### Наши проекты
- Блок со ссылками на другие проекты команды (TBD — будут добавлены)

#### Footer
- Контакты (email, Telegram)
- **Поддержка** — ссылка на наш проект поддержки (TBD)
- Политика конфиденциальности
- Оферта
- Telegram-канал
- Discord-сервер
- **Наши проекты** — ссылки (TBD)

---

## 8. Оплата: DonatePay

### Интеграция

```
1. Пользователь выбирает тариф → POST /api/v1/payments/create
2. Бэкенд генерирует ссылку/форму DonatePay с суммой и metadata
3. Пользователь оплачивает через DonatePay (карта, СБП, etc.)
4. DonatePay отправляет webhook → POST /api/v1/payments/webhook
5. Бэкенд валидирует подпись, активирует/продлевает подписку
6. Пользователю обновляется план
```

### Webhook обработка
```python
@router.post("/api/v1/payments/webhook")
async def donatepay_webhook(request: Request):
    data = await request.json()
    # Валидация подписи DonatePay
    # Извлечение: сумма, user_id (из metadata), plan
    # Создание/продление Subscription
    # Уведомление пользователя
```

---

## 9. Производительность

### Протокол
- PLG Protocol: **10 bytes overhead, ~0.1-0.3ms задержка**
- Без шифрования = минимальная нагрузка на CPU
- Multipath: дупликация критичных пакетов через 2 узла

### Split-tunneling
- WinDivert перехватывает ТОЛЬКО пакеты к game IPs
- Остальной трафик идёт напрямую — без изменений
- DNS-запросы игр тоже через relay (предотвращение leak)

### Выбор узла
1. Предпочтение пользователя
2. Рекомендация профиля игры
3. Метрики: RTT, loss, загрузка → лучший
4. Fallback: деградация узла → предложение переключиться

### Устойчивость
- Порт 443/UDP — не блокируется (QUIC-трафик легитимен)
- Нет VPN-сигнатуры — DPI не определяет
- Пул резервных IP на случай блокировки конкретных адресов
- WireGuard + obfs4 как крайний fallback

---

## 10. Безопасность

1. **JWT:** Access 15min, Refresh 7d, httpOnly cookie
2. **Пароли:** bcrypt cost=12
3. **Rate limiting:** Redis-based
4. **API агентов:** API-key между бэкендом и gateway-агентами
5. **Секреты:** .env, Docker secrets
6. **Логирование:** Не логируем игровой трафик. Только метаданные сессий
7. **Данные:** Минимальный сбор. Возможность удаления аккаунта
