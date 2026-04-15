# Сводка для нового чата (скопируйте блок ниже)

Скопируйте всё между линиями `---` и вставьте в первое сообщение нового чата.

---

## Проект: «Цветы Любимого Города» (Telegram Mini App)

**Путь:** монорепо `telegram_bot_Flowers-Shop-KU` (pnpm + Turborepo): `packages/api` (Fastify 5, Drizzle, PostgreSQL), `packages/mini-app` (React + Vite + Tailwind 4), `packages/bot` (grammY), `packages/shared` (Zod/типы).

### Прогресс (что уже сделано)

- Витрина: каталог, товар, корзина, checkout, заказы, трекинг заказа.
- `POST /api/orders/validate`, создание заказа с проверкой цен/остатков, промокоды, таймлайн статусов.
- Auth: `X-Init-Data` (Telegram) / `X-User-Id` (только dev); бот → API через `INTERNAL_API_SECRET`.
- Security hardening: API/bot `bodyLimit`, единые error/notFound handlers; `X-Init-Data` TTL по умолчанию 15 минут + anti-replay по `query_id`.
- Бот: `/start` с `ref_`, welcome-промо, уведомления о заказах (`/internal/notify` с API).
- Рефералка: бот + `POST /api/users/referral`, mini-app при `startapp=ref_` / `?ref=`.
- Поделиться товаром (deep link `product_<id>`).
- Event bus → уведомления пользователю в Telegram при смене статуса.
- Глобальный rate limit API; GitHub Actions: typecheck + build.
- **Админка:** `/admin` + `/api/admin/*`, ключ `ADMIN_API_SECRET` (заказы, товары).
- **M3 (оплата):** YooKassa — `POST /api/payments`, `GET /api/payments/order/:id`, `POST /api/webhooks/yookassa` (верификация через GET к API YooKassa), таблицы `payments` + `webhook_events`, checkout с `card_online`, `/payment/return`.
- YooKassa webhook: дедупликация до вызова провайдера + отдельный rate limit на webhook.
- **Деплой в Telegram:** прод (HTTPS API + статика + webhook); чеклист: `DEPLOY_TELEGRAM_CHECKLIST.md` (выполнен).

### Следующие шаги (приоритет)

1. **M3 — довести:** при необходимости повторный ручной прогон YooKassa (тестовый магазин/карта); webhook `https://<api>/api/webhooks/yookassa`, `MINI_APP_PUBLIC_URL`, `YOOKASSA_*` на API.
2. **M5** — триггеры и напоминания (cron/worker + Redis).
3. **M6 (опционально):** усиление админки (фильтры, платежи в карточке заказа, RBAC).
4. **M7:** E2E в CI, мониторинг `/health`, `pnpm audit` / Dependabot.

**Дорожная карта с микрошагами:** `ROADMAP.md`  
**Правила Cursor:** `.cursor/rules/project-overview.mdc`

---

*Файл можно удалить после копирования или оставить как шаблон handoff.*
