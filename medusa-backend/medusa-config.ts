import { loadEnv, defineConfig, Modules } from "@medusajs/framework/utils";
import fs from "fs";
import os from "os";
import path from "path";

// Only load .env file in development, not in production (Railway provides env vars)
if (process.env.NODE_ENV !== "production") {
  loadEnv(process.env.NODE_ENV || "development", process.cwd());
}

// Debug: Log if REDIS_URL is available
console.log("REDIS_URL available:", !!process.env.REDIS_URL);

// Ensure MEDUSA_PUBLISHABLE_KEY is available server-side (fallback to NEXT_PUBLIC_*)
if (
  !process.env.MEDUSA_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
) {
  process.env.MEDUSA_PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
}

// Pick Stripe mode from admin switch tmp file (set via Admin UI toggle),
// falling back to STRIPE_MODE env var (useful for Railway production), then "test".
let stripeMode: "test" | "live" = "test";
try {
  const tmpFile = path.join(os.tmpdir(), "4got10-stripe-mode.json");
  const raw = fs.readFileSync(tmpFile, "utf8");
  const parsed = JSON.parse(raw);
  if (parsed?.mode === "live") stripeMode = "live";
} catch {
  // Tmp file not found (e.g. first boot on Railway) — fall back to env var
  if (process.env.STRIPE_MODE === "live") stripeMode = "live";
}

const stripeApiKey =
  stripeMode === "live"
    ? process.env.STRIPE_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret =
  stripeMode === "live"
    ? process.env.STRIPE_WEBHOOK_SECRET_LIVE ||
      process.env.STRIPE_WEBHOOK_SECRET
    : process.env.STRIPE_WEBHOOK_SECRET;

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    cookieOptions: {
      sameSite: "lax",
      secure: false, // Railway proxy handles HTTPS, Express sees HTTP
      httpOnly: true,
      maxAge: 10 * 60 * 60 * 1000, // 10 hours
    },
  },
  modules: [
    {
      resolve: "./src/modules/product_meta",
    },
    {
      resolve: "./src/modules/rollout",
    },
    {
      resolve: "./src/modules/site-settings",
    },
    {
      resolve: "./src/modules/email",
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              additional_client_config: {
                forcePathStyle: true,
              },
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: stripeApiKey,
              webhookSecret: stripeWebhookSecret,
            },
          },
        ],
      },
    },
    {
      key: Modules.ORDER,
      options: {
        generateCustomDisplayId: async () => {
          // Branded short ID: 4GOT-XXXXXX (uppercase alphanumerics, no ambiguous chars)
          const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let suffix = "";
          for (let i = 0; i < 6; i++) {
            suffix += ALPHABET.charAt(
              Math.floor(Math.random() * ALPHABET.length),
            );
          }
          return `4GOT-${suffix}`;
        },
      },
    },
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/auth-emailpass",
            id: "emailpass",
          },
        ],
      },
    },
  ],
});
