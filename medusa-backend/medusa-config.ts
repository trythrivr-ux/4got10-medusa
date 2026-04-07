import { loadEnv, defineConfig } from "@medusajs/framework/utils";

// Only load .env file in development, not in production (Railway provides env vars)
if (process.env.NODE_ENV !== "production") {
  loadEnv(process.env.NODE_ENV || "development", process.cwd());
}

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
  ],
});
