import type { FastifyReply, FastifyRequest } from "fastify";
import { timingSafeEqualString } from "../lib/timing-safe.js";

/**
 * Requires `ADMIN_API_SECRET` in env and matching `X-Admin-Secret` or `Authorization: Bearer <secret>`.
 */
export async function adminAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const secret = process.env.ADMIN_API_SECRET?.trim();
  if (!secret) {
    return reply.status(503).send({
      success: false,
      error: {
        code: "ADMIN_DISABLED",
        message: "Админ-API не настроен (задайте ADMIN_API_SECRET)",
      },
    });
  }

  const header = request.headers["x-admin-secret"];
  const fromHeader = typeof header === "string" ? header.trim() : "";
  const auth = request.headers.authorization;
  const fromBearer =
    typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  const provided = fromHeader || fromBearer;
  if (!provided || !timingSafeEqualString(provided, secret)) {
    return reply.status(401).send({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Неверный ключ админки" },
    });
  }
}
