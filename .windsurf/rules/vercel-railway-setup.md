---
description: Project infrastructure and deployment setup for this Medusa + storefront project
trigger: always_on
---

# Project Deployment Setup

## Core setup

- This project is version-controlled with GitHub.
- The Medusa backend is deployed on Railway.
- The storefront/frontend is deployed on Vercel.
- Treat backend and frontend as separate deployed services with separate environment variables, deployment settings, and runtime behavior.

## Backend setup

- The backend is a Medusa.js service running on Railway.
- Railway is the source of truth for backend deployment configuration, runtime variables, service networking, and public backend domain.
- Never assume localhost values in production code.
- Never hardcode backend domains, API keys, secrets, callback URLs, or webhook URLs.

## Frontend setup

- The frontend/storefront is deployed on Vercel.
- The frontend should connect to the live Railway backend through environment variables.
- Only expose non-sensitive public values to the client, such as public backend URL or Medusa publishable key.
- Never expose secret keys, private tokens, database credentials, Stripe secret keys, or backend-only values to the frontend.

## Environment variable rules

- Treat Railway and Vercel environment variables separately.
- Use different values for development, preview, and production where needed.
- When a build-time variable changes, assume a rebuild/redeploy may be required.
- Keep secrets only in Railway or Vercel server-side environment settings, never in source code.
- Do not commit `.env` files with real secrets to GitHub.
- Prefer environment variables or Railway reference variables over hardcoded URLs.

## Backend ↔ frontend connection rules

- The frontend must use the correct Railway backend URL for the current environment.
- The frontend must use the correct Medusa publishable key for the current environment.
- Backend CORS and store CORS configuration must allow the active Vercel frontend domain.
- Payment return URLs, webhook URLs, auth callback URLs, and API base URLs must match the deployed domains.

## Deployment safety rules

- Before changing deployment-sensitive code, identify whether the change affects:
  - frontend env vars
  - backend env vars
  - CORS
  - Stripe callbacks
  - Medusa publishable keys
  - Railway backend domain
  - Vercel frontend domain
- If any of these are affected, explicitly update deployment config and verify both platforms.

## GitHub workflow rules

- Treat GitHub as the source of truth for code.
- Keep deployment-related configuration in code where safe, and secrets only in platform env settings.
- Do not commit secrets, service role keys, Stripe secrets, or production credentials.
- If setup changes affect deployment, document them in the repo.

## Medusa-specific deployment rules

- Always assume the Medusa backend runs remotely on Railway in production.
- Always assume the storefront runs remotely on Vercel in production.
- Keep the storefront thin and backend-driven.
- When changing checkout, auth, cart, orders, customers, products, or payments, verify the deployed frontend and deployed backend still agree on:
  - API base URL
  - CORS
  - publishable key
  - auth/callback URLs
  - Stripe return URLs
  - webhook handling

## Stripe/payment deployment rules

- Stripe secret keys belong only on the backend.
- Stripe publishable keys may be exposed only if intended for client use.
- Payment flows must use the deployed Vercel frontend URL for return/callback routes when in production.
- Webhooks must point to the live Railway backend, not localhost.
- Never ship payment code without verifying production callback and redirect URLs.

## Expected assistant behavior

When making changes in this project, always:

1. Remember the backend is Railway and the frontend is Vercel.
2. Check whether a change impacts deployment configuration or environment variables.
3. Avoid hardcoded local URLs in production logic.
4. Keep secrets server-only.
5. Preserve compatibility between deployed frontend and deployed backend.
