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
  ],
});
