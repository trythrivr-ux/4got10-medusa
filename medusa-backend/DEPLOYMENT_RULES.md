# Medusa v2 Railway Deployment Rules

## Critical Issues & Solutions

### 1. "Could not find index.html in the admin build directory"

**Root Cause:** Medusa v2 requires the `medusa start` command to be run from inside the `.medusa/server` directory, NOT from the project root.

**Solution:**
- The Dockerfile must run `yarn build` to generate the `.medusa/server/public/admin/index.html` file
- The entrypoint script must `cd .medusa/server` before running `npx medusa start`

### 2. Environment Variables Not Loading

**Root Cause:** Railway provides environment variables at runtime, but Medusa's `loadEnv()` in `medusa-config.ts` can overwrite them with `.env` file values.

**Solution:**
- Conditionally skip `loadEnv()` in production:
```typescript
// medusa-config.ts
if (process.env.NODE_ENV !== 'production') {
  loadEnv(process.env.NODE_ENV || 'development', process.cwd())
}
```

### 3. Railpack vs Dockerfile Builder

**Issue:** Railpack (Railway's new builder) uses multi-stage builds that may not preserve the `.medusa` folder.

**Solution:** Use `builder = "dockerfile"` in `railway.toml` for full control over build artifacts.

---

## Required Files

### Dockerfile
```dockerfile
FROM node:20-bookworm

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN corepack enable && corepack prepare yarn@1.22.22 --activate && yarn install --frozen-lockfile

# Copy source and build
COPY . .
RUN yarn build

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/app/entrypoint.sh"]
```

### entrypoint.sh
```bash
#!/bin/bash
set -e

# Create .env file from Railway environment variables
cat > .env << EOF
DATABASE_URL=$DATABASE_URL
JWT_SECRET=$JWT_SECRET
COOKIE_SECRET=$COOKIE_SECRET
STORE_CORS=$STORE_CORS
ADMIN_CORS=$ADMIN_CORS
AUTH_CORS=$AUTH_CORS
EOF

# Run migrations from root
yarn medusa db:migrate

# CRITICAL: Start from .medusa/server directory
cd .medusa/server
exec npx medusa start
```

### railway.toml
```toml
[build]
builder = "dockerfile"

[deploy]
healthcheckCommand = "curl -f http://localhost:9000/health || exit 1"
healthcheckInterval = "30s"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

### .dockerignore
```
node_modules
.git
.gitignore
*.md
.env
.env.*
!.env.template
integration-tests
.vscode
*.log
.DS_Store
```

---

## Railway Environment Variables

Required variables in Railway dashboard:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Auto-provided by Railway PostgreSQL |
| `JWT_SECRET` | Random secret string |
| `COOKIE_SECRET` | Random secret string |
| `STORE_CORS` | Storefront URLs (comma-separated) |
| `ADMIN_CORS` | Admin URLs (comma-separated) |
| `AUTH_CORS` | Auth URLs (comma-separated) |

---

## Deployment Steps

1. **Add PostgreSQL** to Railway project
2. **Set environment variables** in Railway dashboard
3. **Ensure Dockerfile and entrypoint.sh exist** in repo
4. **Deploy via Railway CLI**: `railway up` or connect GitHub for auto-deploy

---

## Troubleshooting

### "medusa: command not found"
- Use `npx medusa` or `yarn medusa` instead of just `medusa`
- Ensure node_modules are installed in Docker image

### "Database connection failed"
- Verify `DATABASE_URL` is set in Railway
- Check PostgreSQL service is running in Railway

### "Out of memory during build"
- Don't run `medusa build` at startup (already done in Docker build)
- Increase Railway plan memory if needed

### Admin panel returns 404
- Ensure start command runs from `.medusa/server` directory
- Check `.medusa/server/public/admin/index.html` exists after build

---

## Key Learnings

1. **Always run `medusa start` from `.medusa/server`** - this is documented in Medusa troubleshooting docs
2. **Use Dockerfile builder** for Medusa deployments on Railway
3. **Create .env at runtime** from Railway environment variables
4. **Run migrations before start** in entrypoint script
5. **Skip loadEnv() in production** to preserve Railway env vars
