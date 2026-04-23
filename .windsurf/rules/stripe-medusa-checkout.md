---
description: Bulletproof Stripe + Medusa checkout implementation plan (with maintenance rules)
trigger: always_on
---

# Stripe + Medusa Checkout Implementation Plan

> **Prime directive:** Never change checkout without updating this doc, running the full test list at the bottom, and merging only after all checks pass.

---

## Core Architecture

Build the flow around these states only:

- **Payment step**: Initialize Medusa Stripe session and render Stripe Payment Element
- **Review step**: Call `elements.submit()`, then `stripe.confirmPayment(...)`
- **Success step**: Only after Medusa returns `type: "order"` or your callback route validates the Stripe redirect params against the cart payment session and places the order

**Do not advance UI based on button click alone or on a local "success" boolean.** Success is **only** “Medusa order created” (or an equivalent server-confirmed state).

**Any change to:**

- how you call `confirmPayment`
- how you call `completeCart`
- how you navigate between steps

…must be reviewed against this document and the “What to Test Before Launch / After Maintenance” section.

---

## Bulletproof Rules (Non‑Negotiable)

Use these as hard rules in implementation and code review:

1. **Use Payment Element, not a custom card form** – Stripe owns validation and per‑method UX.
2. **Always call `elements.submit()` before `confirmPayment`** – if it errors, show it and stop immediately.
3. **Disable the pay button after first submit** – keep it disabled until the request resolves.
4. **Only one in‑flight payment attempt per cart in the UI** – enforce with a ref gate (`isSubmittingRef`) + React state.
5. **Only show success after server truth** – Medusa cart completion returns an order or the callback route places an order after verifying Stripe redirect params.
6. **Render Stripe errors directly from returned error objects** – use `message` for the user, and log `code`, `type`, etc. for debugging.
7. **No “fire and forget” calls** – every `confirmPayment` and `completeCart` call is awaited and handled; never ignore its result.

If you can’t keep one of these rules for a feature, document the exception in this file (with a big warning) before merging.

---

## The Exact Flow

### Payment Step

When the customer reaches payment:

1. Verify the cart is ready:
   - shipping + billing data present
   - email present
   - region set
   - **total > 0** (zero‑total carts must follow a separate free‑order path)
2. Initialize the Medusa payment session for the Stripe provider (e.g. `pp_stripe_stripe`).
3. Render `PaymentElement` only after Stripe is ready and a client secret exists.

**Track at minimum:**

- `isStripeReady`
- `paymentElementComplete`
- `selectedPaymentMethod`
- `checkoutError`
- `isSubmitting` (and `isSubmittingRef`)

**Button rule:** The “Continue” button stays disabled until:

- Stripe is ready,
- Payment Element reports completion,
- A payment method is selected,
- And there is no in‑flight submission.

### Review Step

On “Place order”:

1. Guard against double click:

   ```ts
   if (isSubmittingRef.current) return;
   isSubmittingRef.current = true;
   setIsSubmitting(true);
   ```

2. Clear previous error state.
3. Call:

   ```ts
   const { error: submitError } = await elements.submit();
   ```

   - If there is an error, show it, set `isSubmittingRef.current = false`, `setIsSubmitting(false)`, and **stay on review**.

4. Call:

   ```ts
   const { error, paymentIntent } = await stripe.confirmPayment({
     elements,
     clientSecret,
     confirmParams,
     redirect: "if_required",
   });
   ```

**Handle the result like this:**

- If `error` exists and `error.payment_intent?.status` is not already successful/authorized, show the error, unlock submit, **do not** advance step.
- If `paymentIntent.status` is `requires_capture` or `succeeded`, call your `completeCart` action **exactly once** for this cart.
- If the payment method redirects externally, let the `return_url` flow handle completion (see “Redirect‑Safe Setup”).

---

## UI State Machine

Your checkout behaves like a strict state machine (no ad‑hoc “flags” that skip states):

- `idle`
- `initializing_payment`
- `payment_ready`
- `payment_invalid`
- `review_ready`
- `confirming_payment`
- `awaiting_redirect_return`
- `completing_cart`
- `order_success`
- `payment_error`
- `cart_completion_error`

**Never transition directly from `confirming_payment` to `order_success`.** The only valid path to `order_success` is via a confirmed order from Medusa (or your server callback).

When editing code:

- Don’t add new states without updating this list.
- Don’t skip states to “simplify” flows.

---

## Error Display

All errors should be obvious to the user and easy to debug later.

**Rules:**

- Use a fixed error box in the payment section, and inline messages where possible.
- Always show a human‑friendly message (Stripe’s `message` if present, otherwise your fallback).
- Log errors (at least in dev) with structured info: `code`, `type`, `payment_intent.status`, and any request id.

**Display strategy:**

- `elements.submit()` error  
  → Show: “Check your payment details and try again.” plus returned message. **Stay on review.**

- `confirmPayment` error  
  → Show `error.message`, unlock submit, **do not** advance step.

- Medusa complete cart returns `type: "cart"` (not `order`)  
  → Show a checkout‑specific error, keep customer on review, offer “Try again” and **do not** navigate to success.

- Redirect callback validation fails  
  → Redirect user to the review step with `?error=payment_failed` (or similar) and show a visible error banner.

- Unknown / network error  
  → Show a generic “Something went wrong, your card may not have been charged. Please check your bank or contact support.” Keep step unchanged and don’t auto‑reset cart.

---

## Redirect‑Safe Setup

For redirect‑based methods and 3DS:

- The `return_url` receives `payment_intent`, `payment_intent_client_secret`, and `redirect_status`.
- You **must** validate these against the active payment session on your server before placing the order.

**Your callback route should:**

1. Read `cartId`, `payment_intent`, `payment_intent_client_secret`, `redirect_status`, and region/country code.
2. Retrieve the cart on the server.
3. Find the Stripe payment session in `cart.payment_collection.payment_sessions`.
4. Verify payment intent id and client secret match the session data.
5. Accept only valid statuses (e.g. succeeded, requires_capture) before calling “place/complete order”.
6. Redirect to the confirmed order page on success, or back to review/payment with an error flag on failure.

Never trust redirect query params alone without server validation.

---

## Recommended Frontend Pattern

Structure the React code so payment logic is centralized and hard to misuse:

- `StripeWrapper` around the checkout route with `Elements`.
- `PaymentStep` that **only** deals with Payment Element UI.
- `ReviewStep` with the final “Place order” button.
- `useCheckoutPaymentMachine()` hook that owns:
  - step/state machine
  - submit locks
  - error state
  - calls to `elements.submit`, `confirmPayment`, and `completeCart`.
- `PaymentStatusBanner` for persistent success/error/pending notices.

**Rule:** Payment orchestration (calls to Stripe + Medusa) must live in a single hook/service. UI components are “dumb” and just call that hook.

---

## Recommended Backend Pattern

On the Medusa side:

1. Use the official Stripe module provider.
2. Enable Stripe per region in Medusa Admin.
3. Configure Medusa’s Stripe webhook endpoint at `/hooks/payment/{provider_id}` using the provider‑specific path.
4. Let Medusa handle webhook verification and payment webhook processing.
5. For storefront callbacks, still add your own `return_url` route for redirect methods and order completion after external authorization.

**Maintenance rule:** Never change webhook URL, Stripe secret, or provider id without:

- updating this file, and
- re‑running the full test list below.

---

## Anti‑Duplicate Protections

To stay as close as possible to “99% success”:

1. Frontend submit lock with both React state and `useRef` so you cannot trigger multiple calls from re‑renders.
2. Disable button and show spinner during `confirmPayment`.
3. Use a single source of truth for success: “Medusa order created” (or equivalent server order entity).
4. On reload mid‑flow, read cart from the backend and recover to payment/review based on `payment_collection` state, not local memory.
5. Persist cart id (URL, context, or memory) so you can refetch and resume on hard refresh.
6. Never call `completeCart` twice for the same cart from different components, effects, or hooks.
7. In code review, search for **all** usages of `confirmPayment` and `completeCart` and ensure they go through the central orchestration hook.

---

## What to Test Before Launch **and After Any Maintenance**

Always run this test matrix before go‑live **and** after any code change touching:

- checkout routes/components
- payment hooks/services
- Stripe / Medusa config
- environment variables for Stripe

**Required test cases:**

1. Successful card payment.
2. 3D Secure success (full redirect + back).
3. Declined card.
4. Expired card / generic processing error.
5. Rapid double‑click on “Place order” while loading (button must not trigger multiple charges).
6. User refresh on review step before order confirmation (checkout should recover gracefully).
7. Redirect‑based payment method returning through `return_url`.
8. Webhook arrives after client loses connection (order still reconciles correctly on backend).
9. Zero‑total cart path (should not hit Stripe, or must follow a dedicated free‑order path).

If any of these fail, **do not ship** and **do not merge** until this file is updated to reflect the fix.

---

## The Production Choice (Snapshot)

For this project, the canonical, “do not mess with this lightly” setup is:

- **Frontend**: React + Stripe Payment Element
- **Backend**: Medusa Stripe module provider
- **Checkout UX**: Payment step collects details, Review step confirms, Success page only after server‑confirmed order
- **Confirm call**: `elements.submit()` then `stripe.confirmPayment({ redirect: "if_required" })`
- **Order creation**: Medusa completes cart after successful/authorized payment, or callback route does it for redirect methods
- **Error handling**: Every Stripe/Medusa error is rendered visibly; no step changes on partial success
- **Webhooks**: Medusa Stripe webhook is configured in Stripe for reconciliation

> If you intentionally change any of these choices (e.g. switch to custom Elements, change redirect strategy), **update this section and the tests above at the same time.**
