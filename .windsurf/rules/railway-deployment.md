
# Railway Deployment Rules

## How Migrations Work in Production

The backend uses a **Dockerfile** + **entrypoint.sh** pattern on Railway.

### How it works

1. Railway builds a Docker image from `medusa-backend/Dockerfile`
2. On container start, `entrypoint.sh` runs:
   - Creates `.env` from Railway environment variables
   - Copies `medusa-config.runtime.js` over the compiled config at `.medusa/server/medusa-config.js`
   - Runs `yarn medusa db:migrate`
   - Starts the server with `cd .medusa/server && exec npx medusa start`

### The critical runtime config rule

**`medusa-config.runtime.js` is the actual production config — NOT `medusa-config.ts`.**

`medusa-config.ts` is only used locally. In production, `entrypoint.sh` overwrites the compiled config with `medusa-config.runtime.js`.

**Every custom module listed in `medusa-config.ts` MUST also be listed in `medusa-config.runtime.js`**, otherwise:
- The module will not load in production
- Its migrations will not run (`db:migrate` only migrates registered modules)
- Awilix will throw `Could not resolve 'module-name'` errors for every request that touches it

Current modules that must stay in sync between both files:
- `./src/modules/product_meta`
- `./src/modules/rollout`
- `./src/modules/site-settings`
- `./src/modules/email`
- `@medusajs/medusa/file` (with S3 provider)
- `@medusajs/medusa/payment` (with Stripe provider)
- `@medusajs/medusa/auth` (with emailpass provider)

### When you add a new module

1. Add it to `medusa-config.ts` (for local dev)
2. Add it to `medusa-config.runtime.js` (for production)
3. Create the migration file in `src/modules/<name>/migrations/`
4. Bust the Docker build cache (see below) so the new files are included in the Railway build

---

## Docker Build Cache

Railway caches Docker build layers. If `COPY src ./src` is cached, new migration files won't be included in the deployed image, so migrations won't run.

### How to force a fresh build

Update `.build-cache` with a new timestamp:

```bash
date +%s > medusa-backend/.build-cache
git add medusa-backend/.build-cache
git commit -m "chore: bust docker build cache"
git push origin main
```

### Why this works

`.build-cache` is the **first COPY step** in the Dockerfile (before `COPY src ./src`). When it changes, Docker invalidates all subsequent layers including `COPY src ./src` and `RUN yarn build`, forcing a fully fresh build with all current source files.

### When to bust the cache

- After adding a new module with migrations
- After any change to `medusa-config.runtime.js`
- If Railway is deploying but new code changes aren't taking effect

---

## Verifying a Migration Ran

**Option 1 — Railway backend service logs:**
Look for the following in the latest deployment logs:
```
MODULE: siteSettings
  ● Migrating Migration20260514000000
  ✔ Migrated Migration20260514000000
  Completed successfully
```

**Option 2 — Railway Data UI:**
Open the Postgres service → Data tab → look for the new table (e.g., `site_settings`). If it exists, the migration ran.

---

## Common Errors and Causes

| Error | Cause | Fix |
|---|---|---|
| `Could not resolve 'rollout'` | Module not in `medusa-config.runtime.js` | Add it to the runtime config |
| Migration not running | New module/migration not in the Docker image (cached build) | Bust the build cache |
| `KnexTimeoutError` on `railway run` | Railway DB is on private network, not accessible from local | Use Railway shell or wait for auto-deploy |
| Settings reset on every redeploy | State stored in `/tmp` files (wiped on container restart) | Store in database via `site-settings` module |
