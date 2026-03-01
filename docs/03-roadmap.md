# PLGames Booster UP — Дорожная карта (FINAL)

> Архитектура: PLG Protocol (custom UDP relay) + WireGuard fallback.
> Ориентир: GearUP Booster, ExitLag.
> Оплата: DonatePay. Домен: TBD.
> Последнее обновление: 2026-03-01

---

## Общий таймлайн

```
Phase 0:  Инфраструктура + серверы                [Неделя 1]     DONE
Phase 1:  Бэкенд-API (ядро)                       [Недели 2–3]   DONE
Phase 2:  PLG Relay Server на узлах                [Недели 3–4]   DONE
Phase 3:  CLI-клиент + E2E тест                    [Недели 4–5]   PARTIAL (E2E тесты — done)
Phase 4:  Windows GUI-клиент (Tauri)               [Недели 5–9]   PARTIAL (UI + auto-updater — done, WinDivert — TODO)
Phase 5:  Landing + Личный кабинет (параллельно)   [Недели 6–9]   DONE
Phase 6:  Мониторинг + Метрики                     [Недели 9–10]  DONE
Phase 7:  Биллинг (DonatePay) + Подписки           [Недели 10–11] DONE
Phase 8:  Админ-панель                             [Недели 11–12] DONE (API only, UI — TODO)
Phase 9:  Multipath + дупликация пакетов           [Недели 12–13] PARTIAL (server-side — done, client — TODO)
Phase 10: Тестирование + Закрытая бета             [Недели 13–14] TODO
Phase 11: Публичный запуск MVP                     [Неделя 15]    TODO
═══ MVP READY (~3.5 месяца) ═══
Phase 12: WireGuard fallback ("Защищённый режим")  [Месяц 4]      TODO
Phase 13: Telegram-бот                             [Месяц 4–5]    TODO
Phase 14: Benchmark + FPS Boost                    [Месяц 5]      TODO
Phase 15: Android-клиент                           [Месяц 5–6]    TODO
Phase 16: Масштабирование                          [Месяц 6+]     TODO
```

---

## Phase 0: Инфраструктура [Неделя 1] — DONE

| # | Задача | Детали | Статус |
|---|--------|--------|--------|
| 0.1 | VPS центральный сервер | DE (Франкфурт), 2 vCPU, 4 GB RAM, 40 GB SSD | DONE |
| 0.2 | VPS gateway-узлы | DE, SE, US, LV — 1-2 vCPU, 2-4 GB RAM | TODO (только центральный) |
| 0.3 | Безопасность серверов | UFW, fail2ban, SSH по ключу, отключить password login | TODO |
| 0.4 | Git-репозиторий | Monorepo: api/, web/, client/, gateway-agent/, relay/, docs/, infra/ | DONE |
| 0.5 | Docker Compose | PostgreSQL 16, Redis 7 на центральном сервере | DONE |
| 0.6 | CI/CD базовый | GitHub Actions: lint, test, build + Client Release | DONE |
| 0.7 | NAT + sysctl на узлах | iptables MASQUERADE, ip_forward, UDP buffers, BBR | TODO |

**Домен:** покупается позже, пока API доступен по IP.
**SSL:** настроится после покупки домена.

### Результат:
- Центральный сервер работает (DE Frankfurt)
- Docker Compose с PostgreSQL 16 + Redis 7
- GitHub Actions CI/CD для api, relay, web, client

---

## Phase 1: Бэкенд-API [Недели 2–3] — DONE

| # | Задача | Детали | Статус |
|---|--------|--------|--------|
| 1.1 | FastAPI проект | Структура: routers, models, schemas, services, config | DONE |
| 1.2 | Alembic + SQLAlchemy | Модели: User, Node, GameProfile, Session, Subscription | DONE |
| 1.3 | Auth модуль | register, login, refresh. JWT. bcrypt | DONE |
| 1.4 | CRUD Games | GET /games, /games/{slug}, /games/search | DONE |
| 1.5 | CRUD Nodes | GET /nodes с метриками, внутренний API статуса | DONE |
| 1.6 | Sessions API | POST /sessions/start → session_id + node + game_ips | DONE |
| 1.7 | Sessions stop | POST /sessions/stop с метриками | DONE |
| 1.8 | Relay session management | При /sessions/start: зарегистрировать session_id на relay-сервере узла | DONE |
| 1.9 | GET /me | Профиль пользователя, план, статистика | DONE |
| 1.10 | Seed-данные | 67 игровых профилей с реальными IP/CIDR/портами/exe-именами | DONE |
| 1.11 | Rate limiting + CORS | Redis rate limiter (ASGI), CORS | DONE |
| 1.12 | Тесты | pytest, 17 тестов, auth + sessions | DONE |

### Результат:
- Полный REST API — 17 тестов проходят
- Auth, Games, Nodes, Sessions
- 67 игровых профилей с иконками

---

## Phase 2: PLG Relay Server на узлах [Недели 3–4] — DONE

**Это ключевой компонент — аналог GearUP AIR / ExitLag Multipath.**

| # | Задача | Детали | Статус |
|---|--------|--------|--------|
| 2.1 | PLG Relay — базовый UDP сервер | Rust. Слушает :443/UDP. Парсит PLG header. | DONE |
| 2.2 | Session validation | DashMap кэш валидных session_id. Sync с API | DONE |
| 2.3 | Packet forwarding | Per-session UDP сокеты, ephemeral port | DONE |
| 2.4 | Response relay | Ответ от game server → PLG header → клиенту | DONE |
| 2.5 | Session tracking | Маппинг: session_id → client_addr, game_server_addr | DONE |
| 2.6 | API управления | HTTP :8443 — POST /sessions/register, DELETE, GET /health | DONE |
| 2.7 | Безопасность API | X-API-Key auth между бэкендом и relay | DONE |
| 2.8 | Ping monitor | Метрики на :9090, Prometheus exporter | DONE |
| 2.9 | Systemd | Автозапуск relay-сервера | TODO |
| 2.10 | Нагрузочный тест relay | iperf-like тест: 50K pkt/sec через relay | TODO |

### Результат:
- PLG Relay (Rust) — 16 тестов проходят
- Per-session UDP сокеты для чистого роутинга
- Management API на :8443, метрики на :9090

---

## Phase 3: CLI-клиент + E2E тест [Недели 4–5] — PARTIAL

**Главный milestone. Если E2E не работает — всё остальное бессмысленно.**

| # | Задача | Детали | Статус |
|---|--------|--------|--------|
| 3.1 | CLI-клиент (Python/Rust) | Логин → выбор игры → получение session → WinDivert → PLG relay | TODO |
| 3.2 | WinDivert интеграция | Перехват UDP-пакетов к game IPs, инъекция ответов | TODO |
| 3.3 | PLG Protocol клиент | Обёртка перехваченных пакетов, отправка на relay :443, приём ответов | TODO |
| 3.4 | Дедупликация | По seq_number — отбрасывать дубли (подготовка для multipath) | TODO |
| 3.5 | Замер пинга ДО/ПОСЛЕ | ICMP ping до game IP напрямую и через relay | TODO |
| 3.6 | E2E: реальная игра | CS2, Dota 2 или LoL через CLI → relay → играем | TODO |
| 3.7 | E2E тесты relay | Python E2E тесты: API → UDP → relay → mock game server | DONE (10/10) |
| 3.8 | Тест доступности серверов | Проверить что через наши узлы доступны все игровые серверы | TODO |
| 3.9 | Нагрузочный тест | 20+ одновременных сессий | TODO |

### Результат:
- E2E тесты relay-сервера — 10/10 проходят
- CLI-клиент и WinDivert — ещё не реализованы

---

## Phase 4: Windows GUI-клиент [Недели 5–9] — PARTIAL

| # | Задача | Детали | Статус |
|---|--------|--------|--------|
| 4.1 | Tauri + React проект | Tauri 2.10, React 18, TypeScript, Tailwind CSS | DONE |
| 4.2 | Дизайн UI (Figma) | Все экраны: Auth, Dashboard, Games, Connection, Session, Settings | TODO |
| 4.3 | Экран авторизации | Логин, регистрация, JWT | DONE |
| 4.4 | Экран списка игр | Карточки, поиск, категории, бейджи | DONE |
| 4.5 | Экран подключения | Узлы с пингом, "Играть с ускорением" | DONE |
| 4.6 | WinDivert + PLG Protocol (Rust) | Перехват → обёртка → relay → ответ → inject | TODO (ключевой!) |
| 4.7 | Dashboard активной сессии | Пинг, потери, jitter, график, маршрут, ДО/ПОСЛЕ | TODO |
| 4.8 | Настройки | Автозапуск, язык, тема, логи | DONE |
| 4.9 | Авто-детект игр | Smart Monitor — мониторинг процессов Windows + авто-оптимизация маршрута | DONE |
| 4.10 | Авто-запуск игры | Запуск .exe после подключения | TODO |
| 4.11 | System tray | Минимизация в трей, контекстное меню | DONE |
| 4.12 | Автообновление | tauri-plugin-updater + GitHub Releases (v0.1.0 опубликован) | DONE |
| 4.13 | Инсталлятор | NSIS (.exe) + MSI (.msi) через Tauri bundler + GitHub Actions | DONE |

### Результат:
- Tauri клиент с UI: auth, игры, узлы, настройки, tray
- Smart Monitor авто-детект игр
- Auto-updater через GitHub Releases
- NSIS + MSI инсталляторы (v0.1.0)
- **TODO:** WinDivert + PLG Protocol (без этого клиент не ускоряет трафик)

---

## Phase 5: Landing + Личный кабинет [Недели 6–9] — DONE

| # | Задача | Детали | Статус |
|---|--------|--------|--------|
| 5.1 | Next.js проект | Next.js 14.2, React 18, Tailwind 3.4, TypeScript | DONE |
| 5.2 | Hero-секция | Заголовок, CTA, фоновая анимация | DONE |
| 5.3 | Как это работает | Схема маршрута, 3 шага | DONE |
| 5.4 | Поддерживаемые игры | Сетка логотипов (ISR 1h, Server Component) | DONE |
| 5.5 | Преимущества | 5 карточек | DONE |
| 5.6 | Тарифы | Trial/Monthly/Quarterly/Yearly с кнопками | DONE |
| 5.7 | FAQ | Аккордеон | DONE |
| 5.8 | **Блок "Наши проекты"** | Секция со ссылками на другие проекты команды (TBD) | TODO |
| 5.9 | Footer | GitHub, контакты | DONE |
| 5.10 | Регистрация | Форма через API | DONE |
| 5.11 | Личный кабинет: Dashboard | План, статистика, сессии | DONE |
| 5.12 | Личный кабинет: История | Таблица сессий | DONE |
| 5.13 | Личный кабинет: Подписка | План, DonatePay оплата | DONE |
| 5.14 | Настройки профиля | Пароль, привязка Telegram | TODO |
| 5.15 | Страница скачивания | Кнопка, требования, GitHub Releases | DONE |
| 5.16 | SEO | Meta, OG, keywords, favicon | DONE |
| 5.17 | Деплой | Docker, standalone output | DONE |

### Результат:
- Лендинг со всеми секциями (тёмная gaming-тема)
- Личный кабинет с auth, dashboard, подпиской
- 31 исходный файл, порт 13000

---

## Phase 6: Мониторинг + Метрики [Недели 9–10] — DONE

| # | Задача | Детали | Статус |
|---|--------|--------|--------|
| 6.1 | Prometheus | Docker, scrape: self + plgames-api + plgames-relay-de | DONE |
| 6.2 | Grafana | 3 дашборда: api-overview, relay-overview, system-health | DONE |
| 6.3 | Метрики relay-серверов | active sessions, bandwidth, пинг | DONE |
| 6.4 | Алерты | Prometheus → Telegram: node down, high loss, high RTT | TODO |
| 6.5 | Клиентские метрики | API для приёма метрик от клиентов | TODO |
| 6.6 | Общий дашборд | system-health dashboard в Grafana | DONE |

### Результат:
- MetricsMiddleware (pure ASGI) + Prometheus + Grafana
- 3 дашборда, порт 13001
- api_requests_total + api_request_duration_seconds

---

## Phase 7: Биллинг (DonatePay) + Подписки [Недели 10–11] — DONE

| # | Задача | Детали | Статус |
|---|--------|--------|--------|
| 7.1 | Интеграция DonatePay | Статическая donate-страница + PLG:{payment_id} | DONE |
| 7.2 | Webhook обработка | POST /api/billing/webhook, HMAC-SHA256 верификация | DONE |
| 7.3 | Trial логика | 7 дней бесплатно, User.trial_used | DONE |
| 7.4 | Ограничение доступа | get_subscribed_user dependency → 403 | DONE |
| 7.5 | Отмена подписки | 1 кнопка, cancelled_at, работает до конца периода | DONE |
| 7.6 | Уведомления | За 3 дня до окончания → email/Telegram | TODO |
| 7.7 | История платежей | GET /api/billing/payments | DONE |

### Результат:
- DonatePay интегрирован — 17 тестов
- Trial 7 дней, 4 плана: trial/monthly/quarterly/yearly
- Тарифы: $5.99/мес, $14.97/квартал, $47.88/год

---

## Phase 8: Админ-панель [Недели 11–12] — DONE (API)

| # | Задача | Детали | Статус |
|---|--------|--------|--------|
| 8.1 | Пользователи API | Список, поиск, фильтры, детали, бан | DONE |
| 8.2 | Узлы API | CRUD, статус, вкл/выкл, приоритет | DONE |
| 8.3 | Игровые профили API | CRUD: добавить игру, CIDR, порты, exe, иконка | DONE |
| 8.4 | Сессии API | Активные и завершённые, фильтры | DONE |
| 8.5 | Подписки API | Ручное управление, промо-коды | DONE |
| 8.6 | Admin UI (Web) | Веб-интерфейс админки | TODO |
| 8.7 | Grafana embed | Дашборды внутри админки | TODO |

### Результат:
- 24 API эндпоинта /api/admin — 35 тестов
- User.is_admin + get_admin_user dependency
- PaginatedList[T] для всех списков
- **TODO:** Веб-интерфейс админки

---

## Phase 9: Multipath + дупликация [Недели 12–13] — PARTIAL (server-side)

**Это то, что делает нас конкурентоспособными с GearUP/ExitLag.**

| # | Задача | Детали | Статус |
|---|--------|--------|--------|
| 9.1 | Multipath в клиенте | Отправка каждого пакета на 2 узла (primary + backup) | TODO |
| 9.2 | Дедупликация в клиенте | По seq_number: первый ответ принимается, дубль отбрасывается | TODO |
| 9.3 | Multipath в API | backup_node_id, find_backup_node(), multipath=True | DONE |
| 9.4 | Координация узлов | Регистрация сессии на primary + backup relay | DONE |
| 9.5 | Умный multipath | Graceful fallback: 1 узел → multipath_enabled=False | DONE |
| 9.6 | UI: показать multipath | В dashboard: "2 маршрута активны", визуализация | TODO |
| 9.7 | Тестирование | 12 серверных тестов проходят | DONE (server) |

### Результат:
- Server-side multipath — 12 тестов (64 общих)
- Session.backup_node_id + find_backup_node()
- **TODO:** Клиентская часть multipath (дупликация + дедупликация)

---

## Phase 10: Тестирование + Закрытая бета [Недели 13–14] — TODO

| # | Задача | Детали | Done when |
|---|--------|--------|-----------|
| 10.1 | E2E интеграционные тесты | Полный цикл: регистрация → оплата → подключение → игра | Проходит |
| 10.2 | Нагрузочный тест | 50-100 одновременных сессий на узел | Стабильно |
| 10.3 | Тест реальных игр | CS2, Dota 2, Valorant, LoL, Fortnite, PUBG, Apex — все узлы | Все работают |
| 10.4 | Тест multipath | Игра с multipath, симуляция потерь | Потери компенсируются |
| 10.5 | Тест биллинга | Trial → оплата DonatePay → продление → отмена | Весь цикл OK |
| 10.6 | Баг-фиксы | Критические и блокирующие | Нет критических |
| 10.7 | Закрытая бета | 10-30 геймеров, сбор фидбека | Фидбек собран |
| 10.8 | Юр. документы | Политика, оферта, правила | На сайте |

### Результат:
- Всё протестировано, бета пройдена

---

## Phase 11: Публичный запуск MVP [Неделя 15] — TODO

| # | Задача | Детали | Done when |
|---|--------|--------|-----------|
| 11.1 | Финальная проверка | Чеклист всех компонентов | Всё ОК |
| 11.2 | Бэкапы | PostgreSQL daily backup | Работают |
| 11.3 | Логирование | journalctl + Loki | Логи доступны |
| 11.4 | Каналы поддержки | Telegram-группа, ссылка на проект поддержки | Работают |
| 11.5 | Маркетинг | Telegram-каналы, форумы, Reddit | Пользователи приходят |
| 11.6 | Мониторинг | 24/7 алерты первые дни | Реагируем |

### Результат:
**MVP ЗАПУЩЕН** — PLG Protocol + Multipath + DonatePay + полный клиент

---

## ═══ MVP READY (~3.5 месяца) ═══

---

## Phase 12: WireGuard fallback [Месяц 4] — TODO

| # | Задача | Детали |
|---|--------|--------|
| 12.1 | WG серверы на узлах | wg0 интерфейсы, peer management |
| 12.2 | obfs4 wrapper | Обфускация WG handshake для anti-DPI |
| 12.3 | WG в клиенте | wireguard-nt, опция "Защищённый режим" |
| 12.4 | Авто-fallback | PLG fail → автоматическое переключение на WG |
| 12.5 | UI переключатель | В настройках: "Защищённый режим" toggle |

---

## Phase 13: Telegram-бот [Месяц 4–5] — TODO

| # | Задача | Детали |
|---|--------|--------|
| 13.1 | Базовый бот (aiogram 3) | /start, /status, /subscribe, /help |
| 13.2 | Привязка аккаунта | Telegram ID → PLGames аккаунт |
| 13.3 | Статус подписки | План, остаток, дата |
| 13.4 | Уведомления | Окончание подписки, проблемы с узлами |
| 13.5 | Реферальная система | Ссылка, бонус дни |

---

## Phase 14: Benchmark + FPS Boost [Месяц 5] — TODO

| # | Задача | Детали |
|---|--------|--------|
| 14.1 | Benchmark в клиенте | Замер ДО/ПОСЛЕ с графиком |
| 14.2 | Benchmark API | Агрегация, средние по играм |
| 14.3 | Benchmark на лендинге | Реальные данные пользователей |
| 14.4 | FPS Boost | Приоритеты процессов, Game Bar off, CPU parking |

---

## Phase 15: Android-клиент [Месяц 5–6] — TODO

| # | Задача | Детали |
|---|--------|--------|
| 15.1 | Kotlin + Compose | Или React Native |
| 15.2 | PLG Protocol мобильный | UDP relay через Android VPN API |
| 15.3 | UI | Порт с Windows |
| 15.4 | Публикация | Google Play или APK |

---

## Phase 16: Масштабирование [Месяц 6+] — TODO

| # | Задача | Детали |
|---|--------|--------|
| 16.1 | Новые узлы | Финляндия, Нидерланды, Польша |
| 16.2 | Авто-деплой | Скрипты быстрого развёртывания узлов |
| 16.3 | Packet Redundancy v2 | Умная дупликация: только при обнаружении потерь |
| 16.4 | Роутер-плагин | ASUS/OpenWRT |
| 16.5 | macOS клиент | Tauri сборка |
| 16.6 | Реферальная v2 | Комиссия за пользователей |
| 16.7 | Партнёрства | Кибер-турниры, стримеры |

---

## Структура репозитория

```
plgames-booster-up/
├── docs/
│   ├── 01-competitive-analysis.md
│   ├── 02-enhanced-specification.md
│   └── 03-roadmap.md
├── api/                           # FastAPI бэкенд
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── utils/
│   │   └── migrations/
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── relay/                         # PLG Relay Server (Rust/Go)
│   ├── src/
│   │   ├── main.rs
│   │   ├── protocol.rs            # PLG Protocol parser
│   │   ├── forwarder.rs           # Packet forwarding + NAT
│   │   ├── session.rs             # Session validation cache
│   │   ├── metrics.rs             # Prometheus exporter
│   │   └── api.rs                 # HTTP API для управления
│   ├── Cargo.toml
│   └── Dockerfile
├── web/                           # Next.js (лендинг + кабинет)
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── i18n/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── client/                        # Tauri + React (Windows клиент)
│   ├── src/                       # React frontend
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── plg_protocol.rs    # PLG Protocol client
│   │   │   ├── windivert.rs       # Packet interception
│   │   │   ├── multipath.rs       # Multipath + dedup
│   │   │   ├── wireguard.rs       # WG fallback
│   │   │   └── process_monitor.rs # Game auto-detect
│   │   └── Cargo.toml
│   └── package.json
├── gateway-agent/                 # Health-check агент (мониторинг)
│   ├── agent.py
│   ├── config.yaml
│   └── systemd/
│       └── gateway-agent.service
├── bot/                           # Telegram-бот (Phase 13)
│   ├── bot.py
│   ├── handlers/
│   └── Dockerfile
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   │   └── nginx.conf
│   ├── prometheus/
│   │   └── prometheus.yml
│   ├── grafana/
│   │   └── dashboards/
│   └── scripts/
│       ├── setup-gateway.sh
│       └── backup.sh
├── .github/
│   └── workflows/
│       ├── api-ci.yml
│       ├── relay-ci.yml
│       ├── web-ci.yml
│       └── client-ci.yml
├── .gitignore
├── .env.example
└── README.md
```

---

## Критический путь

```
Phase 0 ──→ Phase 1 ──→ Phase 2 (PLG Relay) ──→ Phase 3 (E2E !!!)
                                                       │
                                    ┌──────────────────┤
                                    │                  │
                              Phase 4 (GUI)      Phase 5 (Landing)
                                    │                  │
                                    └────────┬─────────┘
                                             │
                                       Phase 6 (Мониторинг)
                                             │
                                       Phase 7 (DonatePay)
                                             │
                                       Phase 8 (Админка)
                                             │
                                       Phase 9 (Multipath)
                                             │
                                       Phase 10 (Бета)
                                             │
                                       Phase 11 (LAUNCH)
```

**Phase 3 — GATE.** Без рабочего E2E (клиент → PLG relay → game server) ничего дальше не строится.

**Phase 4 + Phase 5 — параллельно.** Разные стеки, независимы.

**Phase 9 (Multipath) — перед бетой.** Это наш дифференциатор, должен быть в MVP.

---

## Метрики успеха MVP

| Метрика | Цель |
|---------|------|
| Регистрация → первая игра | < 3 мин |
| Снижение пинга (среднее) | > 30% |
| Потери через наши узлы | < 0.5% |
| Потери с multipath | < 0.05% |
| Uptime узлов | > 99.5% |
| Overhead PLG Protocol | < 0.5ms |
| API response (p95) | < 200ms |
| Размер клиента | < 20 MB |
| RAM клиента | < 80 MB |
| Конверсия trial → paid | > 15% |

---

## Бюджет инфраструктуры

| Ресурс | Цена/мес |
|--------|----------|
| VPS центральный DE (2vCPU/4GB) | ~$8–15 |
| VPS relay DE (2vCPU/4GB) | ~$8–15 |
| VPS relay SE (1vCPU/2GB) | ~$4–8 |
| VPS relay US (2vCPU/2GB) | ~$6–12 |
| VPS relay LV (1vCPU/2GB) | ~$4–8 |
| Домен | ~$1–5 |
| **Итого** | **~$31–63/мес** |

Окупаемость: 7–13 платящих пользователей при средней подписке $5/мес.
