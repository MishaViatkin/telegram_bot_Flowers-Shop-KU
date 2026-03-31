FROM node:22-alpine AS base
WORKDIR /repo

RUN corepack enable

# For pnpm workspaces, prefer a full workspace context to keep
# workspace linking (@flowers-tg/shared) consistent in container builds.
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @flowers-tg/shared clean
RUN pnpm --filter @flowers-tg/shared build
RUN pnpm --filter @flowers-tg/api build
RUN pnpm --filter @flowers-tg/api deploy --prod --legacy /out

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S app && adduser -S app -G app

COPY --from=base /out ./

USER app

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/server.js"]
