import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import Stripe from "stripe";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  completeCartWorkflow,
  capturePaymentWorkflow,
} from "@medusajs/medusa/core-flows";

// POST /custom/stripe/checkout/success
// Body: { session_id: string }
// Creates the Medusa order directly from the cart when Stripe confirms payment.
// Does NOT rely on Medusa's built-in Stripe webhook handler.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { session_id } = (req.body || {}) as { session_id?: string };
    if (!session_id) {
      return res.status(400).json({ error: "session_id is required" });
    }

    // Determine Stripe mode from admin toggle tmp file
    const tmpPath = path.join(os.tmpdir(), "4got10-stripe-mode.json");
    let stripeMode: "test" | "live" = "test";
    try {
      const raw = await fs.readFile(tmpPath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.mode === "live") stripeMode = "live";
    } catch {}

    const STRIPE_SECRET_KEY =
      stripeMode === "test"
        ? process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
        : process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_SECRET_KEY) {
      return res
        .status(500)
        .json({ error: "Stripe secret key is not configured" });
    }

    // Verify the Stripe session and confirm payment was received
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return res.status(402).json({
        error: "Payment not completed",
        payment_status: session.payment_status,
      });
    }

    const cart_id = (session.metadata as any)?.cart_id;
    if (!cart_id) {
      return res
        .status(422)
        .json({ error: "This session has no cart_id metadata." });
    }

    // Sync Stripe-collected customer/shipping details back to the Medusa cart so the order captures them
    try {
      const BACKEND_URL =
        process.env.BACKEND_URL ||
        process.env.MEDUSA_BACKEND_URL ||
        "http://localhost:9000";
      const publishableKey =
        process.env.MEDUSA_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
        "";

      const details: any = session.customer_details || {};
      const shipping: any = session.shipping || {};
      const shipAddr: any = shipping.address || {};
      const billAddr: any = details.address || {};

      const fullName = (shipping.name || details.name || "").trim();
      const [first_name, ...restName] = fullName.split(" ");
      const last_name = restName.join(" ") || undefined;

      const toMedusaAddr = (addr: any, phone?: string) => ({
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        address_1: addr.line1 || addr.line_1 || undefined,
        address_2: addr.line2 || addr.line_2 || undefined,
        city: addr.city || undefined,
        province: addr.state || addr.region || undefined,
        postal_code: addr.postal_code || addr.postalCode || undefined,
        country_code:
          (addr.country || "").toString().toLowerCase() || undefined,
        phone: phone || undefined,
      });

      const shipping_address = toMedusaAddr(
        shipAddr,
        shipping.phone || details.phone,
      );
      const billing_address = toMedusaAddr(
        billAddr,
        details.phone || shipping.phone,
      );

      const cartUpdate: any = {
        email: details.email || undefined,
        shipping_address,
        billing_address,
      };

      await fetch(`${BACKEND_URL}/store/carts/${encodeURIComponent(cart_id)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(publishableKey
            ? { "x-publishable-api-key": publishableKey }
            : {}),
        },
        body: JSON.stringify(cartUpdate),
      }).catch(() => {});
    } catch {}

    // Idempotency: if an order already exists for this cart, return it directly
    try {
      const BACKEND_URL =
        process.env.BACKEND_URL ||
        process.env.MEDUSA_BACKEND_URL ||
        "http://localhost:9000";
      const publishableKey =
        process.env.MEDUSA_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
        "";
      const existsResp = await fetch(
        `${BACKEND_URL}/store/orders?cart_id=${encodeURIComponent(cart_id)}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(publishableKey
              ? { "x-publishable-api-key": publishableKey }
              : {}),
          },
          cache: "no-store",
        },
      );
      if (existsResp.ok) {
        const j = await existsResp.json();
        const existing = Array.isArray(j?.orders) ? j.orders[0] : j?.order;
        if (existing) {
          return res.status(200).json({ status: "confirmed", order: existing });
        }
      }
    } catch {}

    const query = req.scope.resolve("query") as any;

    // Check if order already exists for this cart (idempotency — safe to call multiple times)
    let order: any = null;
    try {
      const { data: orders } = await query.graph({
        entity: "order",
        filters: { cart_id },
        fields: [
          "id",
          "display_id",
          "status",
          "total",
          "subtotal",
          "tax_total",
          "shipping_total",
          "currency_code",
          "email",
          "items.*",
          "shipping_address.*",
        ],
      });
      order = Array.isArray(orders) ? orders[0] : null;
    } catch {}

    // No order yet — authorize payment session (Store API) then complete the cart
    if (!order) {
      try {
        // Fetch payment collection and find Stripe session id
        const BACKEND_URL =
          process.env.BACKEND_URL ||
          process.env.MEDUSA_BACKEND_URL ||
          "http://localhost:9000";
        const publishableKey =
          process.env.MEDUSA_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
          "";

        let paymentCollectionId: string | null = null;
        let paymentSessionId: string | null = null;
        try {
          const cartResp = await fetch(
            `${BACKEND_URL}/store/carts/${encodeURIComponent(
              cart_id,
            )}?fields=payment_collection.id%2Cpayment_collection.payment_sessions.id%2Cpayment_collection.payment_sessions.provider_id`,
            {
              headers: {
                "Content-Type": "application/json",
                ...(publishableKey
                  ? { "x-publishable-api-key": publishableKey }
                  : {}),
              },
              cache: "no-store",
            },
          );
          if (cartResp.ok) {
            const cartJson = await cartResp.json();
            const pc = cartJson?.cart?.payment_collection;
            if (pc?.id) {
              paymentCollectionId = pc.id;
              const stripePs = Array.isArray(pc.payment_sessions)
                ? pc.payment_sessions.find(
                    (s: any) => s?.provider_id === "pp_stripe_stripe",
                  )
                : null;
              paymentSessionId = stripePs?.id || null;
            }

            // Fetch the order from Store API by cart_id to ensure items are populated for the success page
            try {
              const finalResp = await fetch(
                `${process.env.BACKEND_URL || process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"}/store/orders?cart_id=${encodeURIComponent(
                  cart_id,
                )}`,
                {
                  headers: {
                    "Content-Type": "application/json",
                    ...(process.env.MEDUSA_PUBLISHABLE_KEY ||
                    process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
                      ? {
                          "x-publishable-api-key":
                            process.env.MEDUSA_PUBLISHABLE_KEY ||
                            (process.env
                              .NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string),
                        }
                      : {}),
                  },
                  cache: "no-store",
                },
              );
              if (finalResp.ok) {
                const fj = await finalResp.json();
                const byCart = Array.isArray(fj?.orders)
                  ? fj.orders[0]
                  : fj?.order;
                if (byCart) {
                  order = byCart;
                }
              }
            } catch {}
          }
        } catch {}

        // Final pass: fetch order from Store API so the shape matches the storefront expectation (ensures items and display_id)
        try {
          const BACKEND_URL =
            process.env.BACKEND_URL ||
            process.env.MEDUSA_BACKEND_URL ||
            "http://localhost:9000";
          const publishableKey =
            process.env.MEDUSA_PUBLISHABLE_KEY ||
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
            "";
          if (order?.id) {
            const fields =
              "id,display_id,status,payment_status,fulfillment_status,currency_code,subtotal,tax_total,shipping_total,total,*items,*shipping_address";
            const oResp = await fetch(
              `${BACKEND_URL}/store/orders/${order.id}?fields=${encodeURIComponent(
                fields,
              )}`,
              {
                headers: {
                  "Content-Type": "application/json",
                  ...(publishableKey
                    ? { "x-publishable-api-key": publishableKey }
                    : {}),
                },
                cache: "no-store",
              },
            );
            if (oResp.ok) {
              const oJson = await oResp.json();
              if (oJson?.order) {
                order = oJson.order;
              }
            }
          }
        } catch {}

        // Authorize the payment session using Stripe Payment Intent id
        const intentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as any)?.id;
        if (paymentCollectionId && paymentSessionId && intentId) {
          let authorized = false;
          try {
            const paymentModule: any = req.scope.resolve(
              "paymentModuleService",
            );
            await paymentModule.authorizePaymentSession(paymentSessionId, {
              data: {
                payment_intent_id: intentId,
                checkout_session_id: session_id,
                amount:
                  typeof session.amount_total === "number"
                    ? session.amount_total
                    : 0,
                currency_code: session.currency,
              },
            });
            authorized = true;
          } catch (authErr) {
            console.error(
              "[stripe/success] authorizePaymentSession error:",
              (authErr as any)?.message,
            );
          }

          // Fallback: create a manual/system payment session and authorize it
          if (!authorized) {
            try {
              const BACKEND_URL =
                process.env.BACKEND_URL ||
                process.env.MEDUSA_BACKEND_URL ||
                "http://localhost:9000";
              const publishableKey =
                process.env.MEDUSA_PUBLISHABLE_KEY ||
                process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
                "";

              // Create pp_system_default session if not exists
              const createResp = await fetch(
                `${BACKEND_URL}/store/payment-collections/${paymentCollectionId}/payment-sessions`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(publishableKey
                      ? { "x-publishable-api-key": publishableKey }
                      : {}),
                  },
                  body: JSON.stringify({ provider_id: "pp_system_default" }),
                },
              );

              if (createResp.ok) {
                const created = await createResp.json();
                const manualId = created?.payment_session?.id;
                if (manualId) {
                  await fetch(
                    `${BACKEND_URL}/store/payment-collections/${paymentCollectionId}/payment-sessions/${manualId}/authorize`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        ...(publishableKey
                          ? { "x-publishable-api-key": publishableKey }
                          : {}),
                      },
                      body: JSON.stringify({ data: {} }),
                    },
                  );
                }
              }
            } catch (fallbackErr) {
              console.error(
                "[stripe/success] fallback manual authorization error:",
                (fallbackErr as any)?.message,
              );
            }
          }
        }

        console.log(
          `[stripe/success] completing cart ${cart_id} for session ${session_id}`,
        );
        const { result } = await completeCartWorkflow(req.scope).run({
          input: { id: cart_id },
        });
        order = result;
        console.log(
          `[stripe/success] order created: ${order?.id} display_id=${order?.display_id}`,
        );

        // Attempt to capture any authorized payments so the order is marked as paid in Admin
        try {
          if (paymentCollectionId) {
            const { data: payments } = await query.graph({
              entity: "payment",
              filters: { payment_collection_id: paymentCollectionId },
              fields: ["id", "captured_at", "amount", "currency_code"],
            });
            if (Array.isArray(payments)) {
              for (const p of payments) {
                if (!p?.captured_at) {
                  await capturePaymentWorkflow(req.scope).run({
                    input: { payment_id: p.id },
                  });
                  console.log(`[stripe/success] payment captured: ${p.id}`);
                }
              }
            }
          }
        } catch (capErr) {
          console.warn(
            "[stripe/success] capture skipped:",
            (capErr as any)?.message,
          );
        }

        // Re-fetch the order with comprehensive fields for the success page
        try {
          const { data: orders } = await query.graph({
            entity: "order",
            filters: { cart_id },
            fields: [
              "id",
              "display_id",
              "status",
              "payment_status",
              "fulfillment_status",
              "total",
              "subtotal",
              "tax_total",
              "shipping_total",
              "currency_code",
              "email",
              "items.*",
              "items.title",
              "items.quantity",
              "items.unit_price",
              "items.total",
              "items.thumbnail",
              "shipping_address.*",
            ],
          });
          const fullOrder = Array.isArray(orders) ? orders[0] : null;
          if (fullOrder) {
            order = fullOrder;
          }
        } catch {}
      } catch (workflowErr: any) {
        console.error(
          `[stripe/success] completeCartWorkflow error:`,
          workflowErr?.message,
        );
        // If cart was already completed, try fetching the order again
        try {
          const { data: orders } = await query.graph({
            entity: "order",
            filters: { cart_id },
            fields: [
              "id",
              "display_id",
              "status",
              "total",
              "subtotal",
              "tax_total",
              "shipping_total",
              "currency_code",
              "email",
              "items.*",
              "shipping_address.*",
            ],
          });
          order = Array.isArray(orders) ? orders[0] : null;
        } catch {}
      }
    }

    if (!order) {
      return res.status(202).json({
        status: "pending",
        message: "Order could not be created. Please contact support.",
        cart_id,
        session_id,
      });
    }

    // Do not send email here to avoid duplicates on page refresh.
    // The order confirmation email is sent once via the orderCreated workflow/subscriber.

    return res.status(200).json({ status: "confirmed", order });
  } catch (e: any) {
    req.scope?.resolve("logger")?.error("stripe_checkout_success_error", e);
    return res
      .status(500)
      .json({ error: e?.message || "Failed to resolve checkout success" });
  }
};
