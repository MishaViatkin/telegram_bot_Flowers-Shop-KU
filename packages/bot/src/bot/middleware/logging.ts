import type { Context, NextFunction } from "grammy";

export async function loggingMiddleware(ctx: Context, next: NextFunction) {
  const start = Date.now();
  const userId = ctx.from?.id;
  const updateType = ctx.update
    ? Object.keys(ctx.update)
        .filter((k) => k !== "update_id")
        .join(",")
    : "unknown";

  await next();

  const ms = Date.now() - start;
  console.log(`[bot] user=${userId} type=${updateType} ${ms}ms`);
}
