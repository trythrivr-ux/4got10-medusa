---
description: Rules for working correctly with Medusa.js in this project
trigger: always_on
---

# Medusa.js Rules

## Core behavior

- Always treat this project as a Medusa-based commerce system, not a generic Node.js app.
- Prefer Medusa-native patterns before custom architecture.
- Before changing checkout, cart, products, customers, orders, regions, or payments, inspect the existing Medusa flow and preserve compatibility.

## Architecture rules

- Follow Medusa's architecture: API routes call workflows, workflows orchestrate business logic, and modules manage domain resources.
- Prefer workflows for multi-step business actions instead of putting complex logic directly in API routes.
- Keep business logic out of React components and thin API handlers.
- Reuse Medusa modules and existing services before creating custom abstractions.
- Do not bypass Medusa payment, cart, order, or product flows unless explicitly required.

## Backend rules

- When adding backend functionality, first check whether Medusa already provides a module, workflow, API route, or extension point for it.
- Use Medusa workflows for operations that span multiple steps, side effects, or external integrations.
- Keep routes small and delegate orchestration to workflows.
- Preserve idempotency and avoid duplicate order, payment, or fulfillment actions.
- Never introduce payment logic that can double-charge or create duplicate orders.

## Storefront rules

- Treat the storefront as a Medusa client, not a source of truth.
- Use Medusa Store API patterns consistently.
- The storefront must only show checkout success after server-confirmed order creation.
- Never rely on local UI state alone for payment or order success.
- Keep cart, checkout, and order state synced with backend truth.

## Payment rules

- Use Medusa's official Stripe integration patterns when working with Stripe.
- Prefer Stripe Payment Element over custom card forms.
- Always handle payment confirmation, error states, redirects, and cart completion explicitly.
- Never allow multiple in-flight payment submissions for one cart.
- Show all payment errors visibly to the user.

## Integration rules

- Respect environment configuration such as backend URL, publishable key, CORS, and region setup.
- When connecting storefront to backend, verify the correct Medusa backend URL and publishable key are used.
- Do not hardcode secrets, keys, or environment-specific URLs.

## Code change rules

- Before editing Medusa-related code, identify whether the change belongs in:
  - storefront UI
  - API route
  - workflow
  - module/service
  - payment integration
- Keep changes minimal and aligned with the existing Medusa structure.
- When modifying checkout or payments, preserve backward compatibility unless explicitly refactoring the whole flow.

## Safety rules

- Do not invent Medusa APIs, hooks, modules, or config keys.
- Check existing Medusa docs or project code patterns before implementing.
- If uncertain, prefer extending Medusa in the standard way rather than creating parallel custom systems.
- Flag risky changes that affect checkout, orders, payments, inventory, or customer data.

## Expected mindset

When asked to implement Medusa functionality, always:

1. Identify the Medusa domain involved.
2. Find the native Medusa pattern for it.
3. Implement with workflows/modules first.
4. Keep the storefront thin and backend-driven.
5. Protect checkout, payments, and order creation from duplicate or inconsistent states.
