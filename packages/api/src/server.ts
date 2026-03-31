import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocal = resolve(__dirname, "../.env");
const envRoot = resolve(__dirname, "../../../.env");
config({ path: existsSync(envLocal) ? envLocal : envRoot });

import { buildApp } from "./app.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Exiting.");
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_USER_ID_AUTH === "true") {
  console.error(
    "SECURITY: ALLOW_DEV_USER_ID_AUTH=true in production is forbidden. Disable it to prevent X-User-Id user spoofing.",
  );
  process.exit(1);
}

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "0.0.0.0";

let app: Awaited<ReturnType<typeof buildApp>>;

async function main() {
  app = await buildApp();
  await app.listen({ port, host });
}

const shutdown = async () => {
  if (app) {
    app.log.info("Shutting down...");
    await app.close();
  }
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
