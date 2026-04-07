# Deployment Guide

This project is split into two parts:
- **Backend**: Medusa API server (deployed to Railway)
- **Frontend**: Next.js storefront (deployed to Vercel)

---

## 1. Deploy Backend to Railway

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### Step 2: Deploy Backend
1. Click **"New Project"** in Railway
2. Select **"Deploy from GitHub repo"**
3. Choose your repository
4. Set **Root Directory** to `medusa-backend`
5. Railway will auto-detect Node.js

### Step 3: Add PostgreSQL Database
1. In your Railway project, click **"+ Add Service"**
2. Select **"Database"** > **"PostgreSQL"**
3. Railway will automatically set `DATABASE_URL` environment variable

### Step 4: Set Environment Variables
In your Railway backend service, add these variables:

```env
# CORS - Replace with your Vercel URL after deploying frontend
STORE_CORS=http://localhost:8000,https://your-frontend.vercel.app
ADMIN_CORS=http://localhost:5173,http://localhost:9000
AUTH_CORS=http://localhost:5173,http://localhost:9000

# Secrets - Generate secure random strings for production!
JWT_SECRET=your-secure-jwt-secret-here
COOKIE_SECRET=your-secure-cookie-secret-here

# Optional: Redis for caching
# REDIS_URL=redis://...
```

### Step 5: Get Your Backend URL
After deployment, Railway will give you a URL like:
`https://your-backend.up.railway.app`

Save this for the frontend configuration.

---

## 2. Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

### Step 2: Import Project
1. Click **"Add New"** > **"Project"**
2. Import your GitHub repository
3. Set **Root Directory** to `nextjs-starter-medusa`
4. Framework Preset: **Next.js** (auto-detected)

### Step 3: Set Environment Variables
Add these environment variables in Vercel:

```env
# Your Railway backend URL
MEDUSA_BACKEND_URL=https://your-backend.up.railway.app

# Publishable key from your Medusa backend
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_xxxxx
```

To get your publishable key:
1. Go to your Railway backend URL + `/app` (e.g., `https://your-backend.up.railway.app/app`)
2. Log in to Medusa Admin
3. Go to Settings > API Keys
4. Copy the publishable key

### Step 4: Deploy
Click **"Deploy"** and wait for the build to complete.

---

## 3. Update CORS (After Frontend Deploy)

After your frontend is deployed, update the backend CORS settings in Railway:

```env
STORE_CORS=http://localhost:8000,https://your-frontend.vercel.app
```

Redeploy the backend for changes to take effect.

---

## Environment Variables Summary

### Backend (Railway)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Auto-set by Railway PostgreSQL |
| `STORE_CORS` | Frontend URL(s) for store API |
| `ADMIN_CORS` | URLs allowed for admin panel |
| `AUTH_CORS` | URLs allowed for authentication |
| `JWT_SECRET` | Secret for JWT tokens |
| `COOKIE_SECRET` | Secret for cookies |

### Frontend (Vercel)
| Variable | Description |
|----------|-------------|
| `MEDUSA_BACKEND_URL` | Your Railway backend URL |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Publishable key from Medusa |

---

## Troubleshooting

### CORS Errors
- Make sure `STORE_CORS` includes your Vercel frontend URL
- No trailing slashes in URLs

### Database Connection Issues
- Verify PostgreSQL is running in Railway
- Check `DATABASE_URL` is set correctly

### Build Failures
- Check build logs in Railway/Vercel
- Ensure all dependencies are in `package.json`
- Verify Node.js version (requires Node 20+)
