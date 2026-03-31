# Деплой на VPS (Docker Compose + Nginx + Let’s Encrypt)

Этот гайд покрывает деплой **без оплаты** (YooKassa не настраиваем): API + бот (webhook) + mini-app (статика).

## 0) Предусловия

- VPS с Ubuntu 22.04/24.04
- Выберите вариант публикации:
  - **Вариант A (прод)**: домены (A/AAAA → IP VPS):
    - `api.<domain>`
    - `bot.<domain>`
    - `app.<domain>`
  - **Вариант B (без домена, для тестов/пилота)**: публичный HTTPS через Cloudflare Tunnel (trycloudflare) или аналог.

## 1) Базовая подготовка сервера

### 1.1 Обновления и UFW

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install ufw curl ca-certificates gnupg git

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 1.2 Установка Docker + compose plugin

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo docker --version
sudo docker compose version
```

### 1.3 Пользователь для деплоя

```bash
sudo adduser deploy
sudo usermod -aG docker deploy
sudo mkdir -p /opt/flowers-tg
sudo chown deploy:deploy /opt/flowers-tg
```

Дальше выполняйте команды под `deploy`:

```bash
sudo -iu deploy
```

## 2) Клонирование репозитория и структура

```bash
cd /opt/flowers-tg
git clone <your_repo_url> repo
cd repo
```

## 3) Прод-окружение (секреты)

### 3.1 Создать файлы окружения (на сервере)

Создайте:
- `.env.api` (только для контейнера API)
- `.env.bot` (только для контейнера бота)

Генерация секретов:

```bash
openssl rand -hex 32
```

Минимум для API (`.env.api`):

```dotenv
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/flowers_tg
REDIS_URL=redis://redis:6379

TELEGRAM_BOT_TOKEN=...
INTERNAL_API_SECRET=...
ADMIN_API_SECRET=...

# Вариант A (домены):
BOT_NOTIFY_URL=https://bot.<domain>/internal/notify
CORS_ORIGIN=https://app.<domain>
#
# Вариант B (Tunnel):
# BOT_NOTIFY_URL=<bot_public_https_url>/internal/notify
# CORS_ORIGIN=<app_public_https_origin>
```

Минимум для бота (`.env.bot`):

```dotenv
NODE_ENV=production
BOT_PORT=3001
HOST=0.0.0.0

TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...
TELEGRAM_WEBHOOK_SECRET=...
INTERNAL_API_SECRET=...

# Вариант A (домены):
API_BASE_URL=https://api.<domain>
# Вариант B (Tunnel):
# API_BASE_URL=<api_public_https_url>
```

## 4) Mini App (статика)

На сервере можно собрать один раз (или собирать в CI и копировать `dist/`):

```bash
pnpm install
VITE_API_BASE_URL=<api_base_url> VITE_BOT_USERNAME=<bot_username> pnpm --filter @flowers-tg/mini-app build
```

Папка со статикой: `packages/mini-app/dist/`.

## 5) Запуск стека через Docker Compose

Используйте файл `docker-compose.prod.yml` (в репозитории). Перед первым запуском:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Применение схемы БД (однократно/после миграций):

```bash
docker compose -f docker-compose.prod.yml exec api pnpm --filter @flowers-tg/api db:push
```

Локальные проверки на сервере (важно, даже если внешний HTTPS ещё не готов):

```bash
curl -i http://127.0.0.1:3000/health
curl -i http://127.0.0.1:3001/health
```

## 6A) Публикация Вариант A: Nginx + TLS (Let’s Encrypt)

На VPS (root):

```bash
sudo apt -y install nginx certbot python3-certbot-nginx
```

Далее:

- Положить конфиги из `infra/nginx/` в `/etc/nginx/sites-available/` и заменить домены.
- Включить сайты и перезагрузить:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

- Выпустить сертификаты:

```bash
sudo certbot --nginx -d api.<domain> -d bot.<domain> -d app.<domain>
```

- Проверка автопродления:

```bash
sudo certbot renew --dry-run
```

## 6B) Публикация Вариант B: Cloudflare Tunnel (без домена)

Подходит для пилота/тестов: получите 3 публичных HTTPS URL (api/bot/app) без покупки домена.

Установка `cloudflared` на VPS:

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb
cloudflared --version
```

Запуск tunnel (по одному процессу на сервис). В каждой команде вы получите публичный URL вида `https://<random>.trycloudflare.com`:

```bash
# API (наружу) -> localhost:3000
cloudflared tunnel --url http://127.0.0.1:3000

# BOT (наружу) -> localhost:3001
cloudflared tunnel --url http://127.0.0.1:3001

# APP (наружу) -> статический каталог (можно отдать через nginx, или временно через simple http server)
```

Рекомендуемый способ для APP: поставить nginx и раздавать `packages/mini-app/dist`, а tunnel направить на `http://127.0.0.1` (80).

Дальше:
- Подставить полученные публичные URL в `.env.api`/`.env.bot` (`BOT_NOTIFY_URL`, `API_BASE_URL`, `CORS_ORIGIN`) и пересоздать контейнеры.

## 7) Telegram webhook

После того как у вас есть публичный HTTPS URL для бота (домен или tunnel), выставьте webhook:

```bash
curl -sS "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=<bot_public_https_url>/webhook/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d "drop_pending_updates=true"
```

Проверить:

```bash
curl -sS "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## 8) Логи

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=200 api
docker compose -f docker-compose.prod.yml logs -f --tail=200 bot
```

# Деплой на VPS (Docker Compose + Nginx + Let’s Encrypt)

Этот гайд покрывает деплой **без оплаты** (YooKassa не настраиваем): API + бот (webhook) + mini-app (статика).

## 0) Предусловия

- VPS с Ubuntu 22.04/24.04
- Домены (A/AAAA → IP VPS):
  - `api.<domain>`
  - `bot.<domain>`
  - `app.<domain>`

## 1) Базовая подготовка сервера

### 1.1 Обновления и UFW

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install ufw curl ca-certificates gnupg git

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 1.2 Установка Docker + compose plugin

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo docker --version
sudo docker compose version
```

### 1.3 Пользователь для деплоя

```bash
sudo adduser deploy
sudo usermod -aG docker deploy
sudo mkdir -p /opt/flowers-tg
sudo chown deploy:deploy /opt/flowers-tg
```

Дальше выполняйте команды под `deploy`:

```bash
sudo -iu deploy
```

## 2) Клонирование репозитория и структура

```bash
cd /opt/flowers-tg
git clone <your_repo_url> repo
cd repo
```

## 3) Прод-окружение (секреты)

### 3.1 Создать файлы окружения (на сервере)

Создайте:
- `.env.api` (только для контейнера API)
- `.env.bot` (только для контейнера бота)

Генерация секретов:

```bash
openssl rand -hex 32
```

Минимум для API (`.env.api`):

```dotenv
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/flowers_tg
REDIS_URL=redis://redis:6379

TELEGRAM_BOT_TOKEN=...
INTERNAL_API_SECRET=...
BOT_NOTIFY_URL=https://bot.<domain>/internal/notify
CORS_ORIGIN=https://app.<domain>
ADMIN_API_SECRET=...
```

Минимум для бота (`.env.bot`):

```dotenv
NODE_ENV=production
BOT_PORT=3001
HOST=0.0.0.0

TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...
TELEGRAM_WEBHOOK_SECRET=...
INTERNAL_API_SECRET=...
API_BASE_URL=https://api.<domain>
```

## 4) Mini App (статика)

На сервере можно собрать один раз (или собирать в CI и копировать `dist/`):

```bash
pnpm install
VITE_API_BASE_URL=https://api.<domain> VITE_BOT_USERNAME=<bot_username> pnpm --filter @flowers-tg/mini-app build
```

Папка со статикой: `packages/mini-app/dist/`.

## 5) Запуск стека через Docker Compose

Используйте файл `docker-compose.prod.yml` (в репозитории). Перед первым запуском:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Применение схемы БД (однократно/после миграций):

```bash
docker compose -f docker-compose.prod.yml exec api pnpm --filter @flowers-tg/api db:push
```

Проверки:

```bash
curl -i https://api.<domain>/health
curl -i https://bot.<domain>/health
```

## 6) Nginx + TLS (Let’s Encrypt)

На VPS (root):

```bash
sudo apt -y install nginx certbot python3-certbot-nginx
```

Далее:

- Положить конфиги из `infra/nginx/` в `/etc/nginx/` (см. README в той папке).
- Выпустить сертификаты:

```bash
sudo certbot --nginx -d api.<domain> -d bot.<domain> -d app.<domain>
```

Проверка автопродления:

```bash
sudo certbot renew --dry-run
```

## 7) Telegram webhook

После того как `bot.<domain>` доступен по HTTPS, выставьте webhook:

```bash
curl -sS "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://bot.<domain>/webhook/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
  -d "drop_pending_updates=true"
```

Проверить:

```bash
curl -sS "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## 8) Логи

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=200 api
docker compose -f docker-compose.prod.yml logs -f --tail=200 bot
```
# Деплой на VPS (Docker Compose + Nginx + Let’s Encrypt)

Этот гайд покрывает деплой **без оплаты** (YooKassa не настраиваем): API + бот (webhook) + mini-app (статика).

## 0) Предусловия

- VPS с Ubuntu 22.04/24.04
- Домены (A/AAAA → IP VPS):
  - `api.<domain>`
  - `bot.<domain>`
  - `app.<domain>`

## 1) Базовая подготовка сервера

### 1.1 Обновления и UFW

```bash
sudo apt update && sudo apt -y upgrade
sudo apt -y install ufw curl ca-certificates gnupg git

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 1.2 Установка Docker + compose plugin

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo docker --version
sudo docker compose version
```

### 1.3 Пользователь для деплоя

```bash
sudo adduser deploy
sudo usermod -aG docker deploy
sudo mkdir -p /opt/flowers-tg
sudo chown deploy:deploy /opt/flowers-tg
```

Дальше выполняйте команды под `deploy`:

```bash
sudo -iu deploy
```

## 2) Клонирование репозитория и структура

```bash
cd /opt/flowers-tg
git clone <your_repo_url> repo
cd repo
```

## 3) Прод-окружение (секреты)

### 3.1 Создать файлы окружения (на сервере)

Создайте:
- `.env.api` (только для контейнера API)
- `.env.bot` (только для контейнера бота)

Генерация секретов:

```bash
openssl rand -hex 32
```

Минимум для API (`.env.api`):

```dotenv
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/flowers_tg
REDIS_URL=redis://redis:6379

TELEGRAM_BOT_TOKEN=...
INTERNAL_API_SECRET=...
BOT_NOTIFY_URL=https://bot.<domain>/internal/notify
CORS_ORIGIN=https://app.<domain>
ADMIN_API_SECRET=...
```

Минимум для бота (`.env.bot`):

```dotenv
NODE_ENV=production
BOT_PORT=3001
HOST=0.0.0.0

TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...
TELEGRAM_WEBHOOK_SECRET=...
INTERNAL_API_SECRET=...
API_BASE_URL=https://api.<domain>
```

## 4) Mini App (статика)

На сервере можно собрать один раз (или собирать в CI и копировать `dist/`):

```bash
pnpm install
VITE_API_BASE_URL=https://api.<domain> VITE_BOT_USERNAME=<bot_username> pnpm --filter @flowers-tg/mini-app build
```

Папка со статикой: `packages/mini-app/dist/`.

## 5) Запуск стека через Docker Compose

Используйте файл `docker-compose.prod.yml` (в репозитории). Перед первым запуском:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Применение схемы БД (однократно/после миграций):

```bash
docker compose -f docker-compose.prod.yml exec api pnpm --filter @flowers-tg/api db:push
```

Проверки:

```bash
curl -i https://api.<domain>/health
curl -i https://bot.<domain>/health
```

## 6) Nginx + TLS (Let’s Encrypt)

На VPS (root):

```bash
sudo apt -y install nginx certbot python3-certbot-nginx
```

Далее:\n+- Положить конфиги из `infra/nginx/` в `/etc/nginx/` (см. README в той папке).\n+- Выпустить сертификаты:\n+\n+```bash\n+sudo certbot --nginx -d api.<domain> -d bot.<domain> -d app.<domain>\n+```\n+\n+Проверка автопродления:\n+\n+```bash\n+sudo certbot renew --dry-run\n+```\n+\n+## 7) Telegram webhook\n+\n+После того как `bot.<domain>` доступен по HTTPS, выставьте webhook:\n+\n+```bash\n+curl -sS \"https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook\" \\\n+  -d \"url=https://bot.<domain>/webhook/telegram\" \\\n+  -d \"secret_token=<TELEGRAM_WEBHOOK_SECRET>\" \\\n+  -d \"drop_pending_updates=true\"\n+```\n+\n+Проверить:\n+\n+```bash\n+curl -sS \"https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo\"\n+```\n+\n+## 8) Логи\n+\n+```bash\n+docker compose -f docker-compose.prod.yml logs -f --tail=200 api\n+docker compose -f docker-compose.prod.yml logs -f --tail=200 bot\n+```\n+\n*** End Patch"}]}>assistant to=functions.ApplyPatch in commentary क्योंकि यह एक FREEFORM tool call है necesitar? Actually ApplyPatch expects raw string. We'll provide raw. Let's correct. We'll call ApplyPatch with freeform patch. 񢙿 for one file. We'll redo. We'll need not in JSON. We'll do tool call.}
