# Дорожная карта: Цветы Любимого Города

Telegram Mini App — доставка цветов, Каменск-Уральский.

**Правило декомпозиции:** шаги ниже разбиты так, чтобы один шаг ≈ одна проверяемая задача (≈15 минут логики работы; см. практику agentic-engineering). Отмечайте: `- [ ]` → `- [x]`.

**Handoff для нового чата:** см. `HANDOFF_FOR_NEW_CHAT.md`.

---

## Текущий прогресс (сводка)

| Область | Статус |
|--------|--------|
| Витрина, корзина, checkout, заказы | Готово |
| Валидация заказа, промо, рефералка, шаринг, бот, уведомления | Готово |
| API: rate limit, CI typecheck/build | Готово |
| Админка (базовая) | Готово |
| Оплата (YooKassa) | Базовый срез (создание платежа + webhook + UI) |
| Деплой в Telegram | Готово (прод: HTTPS API, статика, webhook бота) |
| Security hardening | Готово (базовый срез M7; см. список ниже) |
| Mini-app UI | Полировка витрины (каталог, карточки, состояния загрузки) |

---

## M2 — Checkout и стабильность (локально)

### Сделано

- [x] `POST /api/orders/validate` (корзина, слоты, цены, остатки)
- [x] Создание заказа с повторной проверкой цен/остатков
- [x] Промокоды на заказе и в корзине
- [x] Таймлайн статусов заказа
- [x] Клиент: страницы каталога, товара, корзины, checkout, списка заказов, трекинга
- [x] Витрина: липкие категории, статус поиска, пустые состояния; карточка товара — бейдж «В корзине», спиннер при добавлении

### Прод (Telegram)

- [x] API на публичном HTTPS
- [x] Статика Mini App на HTTPS
- [x] Бот-сервис (webhook)
- [x] Прод-переменные (`TELEGRAM_BOT_TOKEN`, `INTERNAL_API_SECRET`, `DATABASE_URL`, `CORS_ORIGIN`, …)
- [x] Чеклист `DEPLOY_TELEGRAM_CHECKLIST.md` пройден

---

## M3 — Оплата (следующий крупный фокус)

*Ориентир: один вертикальный срез (happy path), затем расширение. Безопасность: security-review (подпись webhook, секреты, идемпотентность).*

### Проектирование и данные

- [x] Зафиксировать бизнес-правило: **остатки списываются при создании заказа** (как и раньше); при отмене оплаты в YooKassa — заказ → `failed_payment`, остатки возвращаются (как при отмене заказа)
- [x] Таблицы `payments` и `webhook_events` (идемпотентность dedupe_key)
- [x] Схема Drizzle + `push.ts`
- [ ] Вынести типы статусов провайдера в `packages/shared` (при необходимости расширения)

### Конфигурация

- [x] `.env.example`: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `MINI_APP_PUBLIC_URL`, комментарии про тест/бой и webhook URL
- [x] Разделение тест/бой — через разные env (комментарии в `.env.example`)

### API: создание платежа

- [x] `POST /api/payments` — свой заказ, `status=created`, `paymentMethod=card_online`, ответ `confirmationUrl`
- [x] Клиент YooKassa: `POST .../payments`, `Idempotence-Key`, redirect
- [x] Ошибки провайдера → `{ success: false, error }`
- [x] `GET /api/payments/order/:orderId` — сверка статуса после редиректа

### API: webhook

- [x] `POST /api/webhooks/yookassa` (без auth middleware)
- [x] Проверка: **GET платежа в YooKassa** по `object.id` из тела (не доверяем только телу)
- [x] Идемпотентность: `webhook_events.dedupe_key`
- [x] Anti-DoS: дедупликация **до** вызова провайдера + отдельный rate limit на webhook
- [x] `succeeded` → заказ `created` → `confirmed`, таймлайн, event bus
- [x] `canceled` / `cancelled` → `failed_payment`, возврат остатков
- [x] Логи: без секретов тела (при ошибках — коды/ids)

### Mini-app

- [x] Checkout: при `card_online` — `POST /payments` и переход в YooKassa (`openLink` / `location`)
- [x] Страница `/payment/return` — опрос статуса заказа
- [x] Карточка заказа: «Перейти к оплате», если `created` + card_online

### Проверка и регрессии

- [ ] Ручной сценарий: тестовый магазин YooKassa, тестовая карта
- [ ] При необходимости: mock-оплата только в `NODE_ENV=development` (не в прод-сборке)

---

## M4 — Рост (рефералка и viral)

### Сделано

- [x] `/start ref_…` в боте → `POST /api/users/referral` + welcome-промо
- [x] Deep link в mini-app (`ref_`, `?ref=`)
- [x] `useReferralAttribution` + `claimReferral` в mini-app
- [x] Кнопка «Поделиться» на карточке товара

### Опционально позже

- [ ] Аналитика конверсии по рефералам (события / дашборд)
- [ ] Награды рефереру после выполнения условий (сейчас запись `referrals` с `pending`)

---

## M5 — Триггеры и напоминания

*После стабильного M3. Redis в docker-compose; при необходимости — очередь.*

- [ ] Выбрать механизм: cron на сервере / worker / BullMQ + Redis
- [ ] Задача: напоминание о доставке (за N часов)
- [ ] Задача: брошенная корзина (через X часов, лимит частоты)
- [ ] Идемпотентность отправки (не спамить)
- [ ] Метрики/логи сбоев доставки в Telegram

---

## M6 — Админка, RBAC и выход в прод

### Админка (уже есть база)

- [x] Вход по `ADMIN_API_SECRET` (sessionStorage)
- [x] Список заказов, смена статуса по `ORDER_STATUS_FLOW`
- [x] Список товаров: остаток, цена, активность

### Усиление админки (опционально)

- [ ] Фильтры/поиск заказов по дате, статусу, user id
- [ ] Просмотр платежей (после M3) в карточке заказа
- [ ] Роли: отдельные учётки или SSO (оценка трудозатрат)

### Релиз в Telegram

- [x] Пункты `DEPLOY_TELEGRAM_CHECKLIST.md` выполнены
- [x] `CORS_ORIGIN` под origin Mini App
- [x] Webhook бота настроен (`secret_token` / ограничение доступа)
- [x] Смоук-тест из Telegram: каталог → заказ → (оплата) → уведомление

---

## M7 — Надёжность и качество

### Сделано

- [x] Глобальный rate limit (`@fastify/rate-limit`)
- [x] CI: `turbo typecheck` + `turbo build` + `turbo lint` (Biome)
- [x] Security headers (Fastify Helmet) для API и bot-сервиса
- [x] Graceful shutdown + закрытие DB соединений (API) / остановка long-polling (bot)
- [x] Отдельный лимит на `/api/admin` (защита от перебора секрета)
- [x] API: `bodyLimit` + единый error/notFound handler (без утечки внутренних ошибок)
- [x] Bot: `bodyLimit` + rate limit + единый error/notFound handler
- [x] Auth: уменьшен TTL `X-Init-Data` (по умолчанию 15 минут) + anti-replay по `query_id`
- [x] Cart: сериализация мутаций на сервере (advisory lock) и на клиенте (очередь мутаций)

### Очередь

- [x] Линтер в CI: **Biome** через `pnpm exec turbo run lint` (`.github/workflows/ci.yml`)
- [x] E2E: Playwright smoke (каталог → переход в корзину) — `packages/e2e/tests/smoke.spec.ts`
- [ ] Запуск E2E в GitHub Actions (сервер/фикстуры/таймауты) — по необходимости
- [ ] Опционально: контрактные тесты критичных API
- [ ] Мониторинг: uptime `/health`, алерты по 5xx (хостинг или UptimeRobot)
- [ ] `pnpm audit` в CI или Dependabot

### Инструменты разработчика (Cursor)

- [x] Скрипт и конфиг MCP **Ruflo**: `scripts/setup-ruflo-cursor.sh`, корневой `.mcp.json`, проектный `.cursor/mcp.json` (`npx -y ruflo@latest mcp start`)

---

## Связь со скиллами (когда применять)

| Скилл | Как использовать в этом проекте |
|--------|----------------------------------|
| **agentic-engineering** | Декомпозиция задач, критерии готовности шага, регресс после изменений |
| **security-review** | Платежи, webhook, секреты, админка, CORS в проде |
| **backend-patterns** | Новые маршруты Fastify, ошибки, валидация Zod |
| **e2e-testing** | Playwright после стабилизации основных флоу |
| **tdd-workflow** | По желанию — тесты перед фичами на критичных модулях |
| **deployment-patterns** | Регрессии после изменений, мониторинг `/health` в проде |

---

## Стек

| Слой | Технологии |
|------|------------|
| Monorepo | pnpm workspaces, Turborepo |
| API | Fastify 5, Drizzle, PostgreSQL |
| Mini-app | React 18, Vite 6, Tailwind CSS 4 |
| Бот | grammY, Fastify |
| Общее | `packages/shared` — типы и Zod |

---

## Как вести этот файл

1. Отмечайте чекбоксы по мере выполнения.
2. Не удаляйте выполненные пункты — так видна история объёма.
3. Краткий снимок для Cursor: `.cursor/rules/project-overview.mdc`.

*Последнее обновление: 15 апреля 2026.*
