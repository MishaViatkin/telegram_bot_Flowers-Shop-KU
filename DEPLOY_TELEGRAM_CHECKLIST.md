# Чеклист деплоя в Telegram (бот + Mini App)

> **Когда использовать:** шаг дорожной карты **M6** (выход в прод). До этого разработка ведётся локально без обязательного прохождения чеклиста — см. `ROADMAP.md`.

Монорепозиторий **Цветы Любимого Города**: API (`packages/api`), Mini App (`packages/mini-app`), бот (`packages/bot`).

Отмечайте пункты по мере выполнения: `- [ ]` → `- [x]`.

---

## 0. Подготовка

- [ ] Есть **публичный HTTPS** для Mini App (обязательно для Web App в Telegram).
- [ ] Есть **публичный HTTPS** для API (или один домен с reverse proxy: `/api` → API, `/` → статика Mini App).
- [ ] Выбран хостинг: VPS / Railway / Fly.io / Render / свой Nginx и т.д.
- [ ] Зарезервировано доменное имя (или поддомены): например `app.example.com` (Mini App), `api.example.com` (API) — или один домен с путями.

---

## 1. База данных

- [ ] Поднят **PostgreSQL** (версия совместима с проектом, см. `docker-compose.yml`).
- [ ] Создана БД и пользователь с правами на неё.
- [ ] В проде задана **`DATABASE_URL`** (в переменных окружения процесса API, не в git).
- [ ] Выполнена инициализация схемы и при необходимости сиды:
  - [ ] `pnpm --filter @flowers-tg/api run db:setup` (или ваш CI/CD шаг с тем же эффектом на прод-сервере).

---

## 2. Переменные окружения (прод)

Сверьтесь с **`.env.example`**. Минимум для работы в Telegram:

### API (`packages/api`, процесс `node dist/server.js` или аналог)

- [ ] **`NODE_ENV=production`**
- [ ] **`DATABASE_URL`**
- [ ] **`TELEGRAM_BOT_TOKEN`** — токен бота из [@BotFather](https://t.me/BotFather) (нужен для проверки `X-Init-Data`).
- [ ] **`INTERNAL_API_SECRET`** — общий секрет с ботом; сгенерировать: `openssl rand -hex 32`.
- [ ] **`BOT_NOTIFY_URL`** — полный URL до эндпоинта бота, например `https://bot.example.com/internal/notify` (тот же хост, где слушает сервис бота).
- [ ] **`CORS_ORIGIN`** — origin Mini App **точно**, через запятую если несколько:  
  `https://app.example.com`  
  (без слэша в конце; совпадает с тем, что открывает Telegram WebView).
- [ ] **`PORT` / `HOST`** — как слушает API за reverse proxy.
- [ ] **`ADMIN_API_SECRET`** — если используете веб-админку `/admin` (отдельный длинный секрет).

Не включать в прод без необходимости:

- [ ] **`ALLOW_DEV_USER_ID_AUTH`** — не задавать (или `false`), иначе возможна подмена пользователя.
- [ ] **`ALLOW_USER_ORDER_STATUS_PATCH`** — обычно не нужен (смена статусов через админку / поддержку).

Опционально:

- [ ] **`INIT_DATA_MAX_AGE_SEC`** — при необходимости сузить окно жизни `initData`.
- [ ] **`RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS`** — при высокой нагрузке подстроить под мониторинг.

### Бот (`packages/bot`)

- [ ] **`TELEGRAM_BOT_TOKEN`** — тот же бот.
- [ ] **`TELEGRAM_BOT_USERNAME`** — username **без** `@`, как в BotFather.
- [ ] **`INTERNAL_API_SECRET`** — **тот же**, что у API.
- [ ] **`API_BASE_URL`** — публичный базовый URL API, например `https://api.example.com` (бот дергает `/api/users/...`).
- [ ] **`BOT_PORT` / `HOST`** — порт процесса бота (за Nginx — прокси на этот порт).
- [ ] **`NODE_ENV=production`** — для режима **webhook** (см. код бота: в production ожидается webhook, не long polling).

### Сборка Mini App (Vite, **на этапе build**)

Переменные с префиксом **`VITE_`** вшиваются в клиент — не класть туда секреты.

- [ ] **`VITE_API_BASE_URL`** — публичный URL API, например `https://api.example.com` (запросы идут на `{VITE_API_BASE_URL}/api/...`).
- [ ] **`VITE_BOT_USERNAME`** — тот же username бота (deep link `t.me/...`, шаринг).

После изменения `VITE_*` — **пересобрать** Mini App (`pnpm --filter @flowers-tg/mini-app run build`) и заново выложить `dist/`.

---

## 3. Деплой API

- [ ] Собран shared + API: из корня `pnpm install`, затем `pnpm exec turbo run build --filter=@flowers-tg/api` (или полный `build`).
- [ ] Процесс запускается с прод-переменными (systemd, Docker, платформа).
- [ ] Проверка: `GET https://api.example.com/health` → `{"status":"ok"}` (или ваш путь).
- [ ] За reverse proxy: TLS, таймауты, при необходимости лимит размера тела для JSON.

---

## 4. Деплой бота (Fastify + grammY)

- [ ] Собран и запущен процесс бота с прод-переменными.
- [ ] Проверка: `GET https://bot.example.com/health` (или ваш URL) → ответ сервиса бота.
- [ ] **Webhook Telegram** (в production в коде используется webhook-режим):
  - [ ] Вызван `setWebhook` у Bot API с URL вида `https://bot.example.com/webhook/telegram`.
  - [ ] Рекомендуется задать **secret_token** (Bot API) и проверять заголовок **`X-Telegram-Bot-Api-Secret-Token`** на своей стороне (если уже реализовано в проекте — включить и задать значение).
- [ ] Эндпоинт **`POST .../internal/notify`** недоступен без **`X-Internal-Secret`** в проде (в коде при `NODE_ENV=production` без секрета уведомления отключаются — секрет обязателен).

---

## 5. Деплой Mini App (статика)

- [ ] Сборка с прод **`VITE_*`** (см. выше).
- [ ] Выложен каталог **`packages/mini-app/dist/`** на CDN / S3+CloudFront / Nginx / Vercel Static и т.д.
- [ ] Открывается по **HTTPS**, без смешанного контента (все запросы к API — тоже HTTPS).
- [ ] В Telegram WebView нет блокировки из-за CSP на стороне хостинга (при проблемах — проверить заголовки безопасности хоста).

---

## 6. Настройка в Telegram (BotFather)

- [ ] Команды и описание бота при необходимости обновлены (`/setcommands` и т.д.).
- [ ] **Menu Button / Web App** указывает на **HTTPS** URL вашего Mini App (тот же origin, что в **`CORS_ORIGIN`**).
- [ ] Проверена ссылка **Open App** из чата с ботом: приложение грузится, каталог и авторизация работают.
- [ ] Проверены **deep link** из кода: `startapp=product_...`, `cart`, `ref_...` — открываются нужные экраны.

---

## 7. Согласованность URL (частые ошибки)

- [ ] **`CORS_ORIGIN`** = схема + хост + порт (если не 443) Mini App **буква в букву** как в браузере/Telegram.
- [ ] **`VITE_API_BASE_URL`** без завершающего `/`; API отвечает на `/api/...`.
- [ ] **`BOT_NOTIFY_URL`** указывает на **бот**, не на API.
- [ ] **`API_BASE_URL`** у бота указывает на **API**, без лишнего `/api` в конце (в коде пути уже с `/api/...`).

---

## 8. Админка (если используете)

- [ ] Mini App с маршрутом `/admin` доступен по тому же деплою или отдельному URL — тогда этот origin тоже в **`CORS_ORIGIN`**.
- [ ] **`ADMIN_API_SECRET`** сильный, не совпадает с `INTERNAL_API_SECRET`.
- [ ] Доступ к `/admin` ограничен по политике компании (VPN, IP, отдельный поддомен).

---

## 9. После деплоя — смоук-тест

- [ ] Открыть Mini App из Telegram → каталог, товар, корзина.
- [ ] Оформить тестовый заказ → заказ в списке, статус обновляется.
- [ ] При смене статуса заказа (админка или поддержка) пользователю приходит уведомление в Telegram (цепочка API → `BOT_NOTIFY_URL` → бот).
- [ ] Рефералка / промо первого заказа (если используете): сценарий `/start` и открытие по `ref_`.

---

## 10. Эксплуатация

- [ ] Бэкапы БД по расписанию.
- [ ] Логи API/бота собираются и хранятся с ограниченным сроком (без утечки PII в публичные каналы).
- [ ] План ротации секретов: `INTERNAL_API_SECRET`, `ADMIN_API_SECRET`, при компрометации — смена в одном месте + рестарт сервисов.

---

*Файл можно дополнять под ваш хостинг (Docker Compose на VPS, Kubernetes и т.д.). Актуальные переменные — всегда в `.env.example`.*
