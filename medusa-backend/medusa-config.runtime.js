// Runtime config that bypasses TypeScript compilation cache issues
// This file is copied at container startup to ensure fresh config

const { defineConfig } = require("@medusajs/framework/utils");

console.log("=== RUNTIME CONFIG ===");
console.log("REDIS_URL available:", !!process.env.REDIS_URL);
console.log("NODE_ENV:", process.env.NODE_ENV);

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      authCors: process.env.AUTH_CORS,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    cookieOptions: {
      sameSite: "lax",
      secure: false,
      httpOnly: true,
      maxAge: 10 * 60 * 60 * 1000,
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
              apiKey:
                process.env.STRIPE_MODE === "live"
                  ? process.env.STRIPE_SECRET_KEY
                  : process.env.STRIPE_SECRET_KEY_TEST ||
                    process.env.STRIPE_SECRET_KEY,
              webhookSecret:
                process.env.STRIPE_MODE === "live"
                  ? process.env.STRIPE_WEBHOOK_SECRET_LIVE ||
                    process.env.STRIPE_WEBHOOK_SECRET
                  : process.env.STRIPE_WEBHOOK_SECRET,
            },
          },
        ],
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
