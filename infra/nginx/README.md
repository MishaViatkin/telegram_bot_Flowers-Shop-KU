## Nginx конфиги (api / bot / app)

Папка содержит шаблоны server block'ов для схемы с поддоменами:
- `api.<domain>` → прокси на `127.0.0.1:3000`
- `bot.<domain>` → прокси на `127.0.0.1:3001`
- `app.<domain>` → статика из `packages/mini-app/dist`

### Как использовать на VPS

1. Скопировать файлы в `/etc/nginx/sites-available/` и подставить домены.
2. Создать симлинки в `/etc/nginx/sites-enabled/`.
3. Проверить конфиг и перезагрузить:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

TLS выпускается через Certbot (`certbot --nginx ...`).
