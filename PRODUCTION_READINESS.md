## Production readiness (без деплоя и оплаты)

Этот файл фиксирует “гейты” качества/безопасности проекта **до** этапов деплоя в Telegram (M6) и проверки оплаты (M3).

### ✅ Текущее состояние (должно быть зелёным перед релизом)

- **Build**: `pnpm exec turbo run build` проходит для всех пакетов.
- **Types**: `pnpm exec turbo run typecheck` проходит.
- **Lint**: `pnpm exec turbo run lint` проходит (Biome).
- **API безопасность**:
  - `ALLOW_DEV_USER_ID_AUTH=true` запрещён в `NODE_ENV=production` (fail-fast).
  - `CORS_ORIGIN` обязателен в `NODE_ENV=production` (fail-fast).
  - `/api/admin/*` защищён `ADMIN_API_SECRET` и имеет отдельный rate limit.
  - Логи редактируют (`redact`) `X-Init-Data`, `X-Internal-Secret`, `X-Admin-Secret`, `Authorization`.
- **Bot безопасность**:
  - В `NODE_ENV=production` требуется `TELEGRAM_WEBHOOK_SECRET` и проверяется заголовок `X-Telegram-Bot-Api-Secret-Token`.
  - `/internal/notify` в production требует `INTERNAL_API_SECRET`.
- **Надёжность**:
  - Graceful shutdown: API закрывает Fastify + DB соединение; bot останавливает long-polling и закрывает сервер.
  - Есть `GET /health` на API и bot.

### 🧩 Обязательные переменные окружения (для production-контуров без деплоя)

См. `.env.example`. Критичное:

- **API**: `NODE_ENV=production`, `DATABASE_URL`, `CORS_ORIGIN`, `TELEGRAM_BOT_TOKEN`, `INTERNAL_API_SECRET`, (опционально) `ADMIN_API_SECRET`.
- **Bot**: `NODE_ENV=production`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `INTERNAL_API_SECRET`.

### 🧪 Рекомендуемые следующие шаги (усиливают “prod-ready”)

- **E2E smoke** (Playwright): каталог → корзина → checkout → заказ (без оплаты).
- **Dependency security**: `pnpm audit`/Dependabot.
- **Monitoring**: внешняя проверка `/health`, алерты на 5xx.

