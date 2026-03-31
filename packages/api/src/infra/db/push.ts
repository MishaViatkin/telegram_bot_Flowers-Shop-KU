import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocal = resolve(__dirname, "../../../.env");
const envRoot = resolve(__dirname, "../../../../../.env");
config({ path: existsSync(envLocal) ? envLocal : envRoot });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pg = postgres(DATABASE_URL, { max: 1 });

async function push() {
  console.log("Creating tables...");

  await pg.unsafe(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL,
      original_price REAL,
      images JSONB NOT NULL DEFAULT '[]',
      category_id TEXT NOT NULL REFERENCES categories(id),
      composition TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
    CREATE INDEX IF NOT EXISTS products_active_idx ON products(active);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      telegram_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT,
      username TEXT,
      phone TEXT,
      referral_code TEXT NOT NULL UNIQUE,
      referred_by TEXT,
      first_order_promo_issued BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_idx ON users(telegram_id);

    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      items JSONB NOT NULL DEFAULT '[]',
      promo_code TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS carts_user_id_idx ON carts(user_id);

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'draft',
      items JSONB NOT NULL,
      recipient JSONB NOT NULL,
      address JSONB NOT NULL,
      delivery_slot JSONB NOT NULL,
      payment_method TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      delivery_fee REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      promo_code TEXT,
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
    CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);

    CREATE TABLE IF NOT EXISTS order_timeline (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      status TEXT NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS order_timeline_order_idx ON order_timeline(order_id);

    CREATE TABLE IF NOT EXISTS promo_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      valid_until TIMESTAMPTZ NOT NULL,
      min_order_amount REAL,
      max_uses INTEGER NOT NULL DEFAULT 1,
      used_count INTEGER NOT NULL DEFAULT 0,
      user_id TEXT,
      active BOOLEAN NOT NULL DEFAULT true
    );

    CREATE INDEX IF NOT EXISTS promo_codes_code_idx ON promo_codes(code);

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL REFERENCES users(id),
      referred_user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      reward_amount REAL NOT NULL DEFAULT 200,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_id);

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      provider TEXT NOT NULL DEFAULT 'yookassa',
      external_id TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'RUB',
      status TEXT NOT NULL,
      confirmation_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS payments_order_idx ON payments(order_id);
    CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      dedupe_key TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS webhook_events_provider_idx ON webhook_events(provider);
  `);

  console.log("All tables created successfully.");
  await pg.end();
}

push().catch((err) => {
  console.error("Push failed:", err);
  process.exit(1);
});
