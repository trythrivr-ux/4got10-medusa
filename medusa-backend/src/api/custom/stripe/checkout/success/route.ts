import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import Stripe from "stripe";
import {
  completeCartWorkflow,
  capturePaymentWorkflow,
} from "@medusajs/medusa/core-flows";

// Ensure the cart has a shipping method selected before completing the order.
// Stripe Checkout collects the shipping address but never sets a Medusa
// shipping_method on the cart, so completeCartWorkflow would otherwise fail
// with: "No shipping method selected but the cart contains items that require shipping."
async function ensureShippingMethod(
  cart_id: string,
  backendUrl: string,
  publishableKey: string,
): Promise<void> {
  try {
    // 1. Check current cart for an existing shipping method
    const cartResp = await fetch(
      `${backendUrl}/store/carts/${encodeURIComponent(
        cart_id,
      )}?fields=id%2Cshipping_methods.id%2Cshipping_methods.shipping_option_id`,
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
      const cartJson: any = await cartResp.json();
      const existing = cartJson?.cart?.shipping_methods;
      if (Array.isArray(existing) && existing.length > 0) {
        return; // already has one
      }
    }

    // 2. Fetch shipping options available for this cart
    const optsResp = await fetch(
      `${backendUrl}/store/shipping-options?cart_id=${encodeURIComponent(cart_id)}`,
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
    if (!optsResp.ok) {
      console.warn(
        "[stripe/success] could not list shipping options:",
        optsResp.status,
        await optsResp.text().catch(() => ""),
      );
      return;
    }
    const optsJson: any = await optsResp.json();
    const options: any[] = Array.isArray(optsJson?.shipping_options)
      ? optsJson.shipping_options
      : [];
    if (!options.length) {
      console.warn(
        "[stripe/success] no shipping options available for cart:",
        cart_id,
      );
      return;
    }

    // 3. Pick the cheapest option (or the first if amounts are missing)
    const sorted = options
      .filter((o) => o?.id)
      .sort((a, b) => {
        const aAmt = Number.isFinite(a?.amount) ? a.amount : Infinity;
        const bAmt = Number.isFinite(b?.amount) ? b.amount : Infinity;
        return aAmt - bAmt;
      });
    const chosen = sorted[0];
    if (!chosen?.id) return;

    // 4. Add it to the cart
    const addResp = await fetch(
      `${backendUrl}/store/carts/${encodeURIComponent(cart_id)}/shipping-methods`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(publishableKey
            ? { "x-publishable-api-key": publishableKey }
            : {}),
        },
        body: JSON.stringify({ option_id: chosen.id }),
      },
    );
    if (!addResp.ok) {
      console.warn(
        "[stripe/success] failed to add shipping method:",
        addResp.status,
        await addResp.text().catch(() => ""),
      );
      return;
    }
    console.log(
      `[stripe/success] added shipping method ${chosen.id} (${chosen.name || ""}) to cart ${cart_id}`,
    );
  } catch (err) {
    console.warn(
      "[stripe/success] ensureShippingMethod error:",
      (err as any)?.message,
    );
  }
}

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

    // Stripe mode is deploy-time only (env-driven) so this matches the
    // registered Stripe provider's apiKey + webhookSecret loaded at boot.
    const stripeMode: "test" | "live" =
      process.env.STRIPE_MODE === "live" ? "live" : "test";

    const STRIPE_SECRET_KEY =
      stripeMode === "test"
        ? process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
        : process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_SECRET_KEY) {
      return res
        .status(500)
        .json({ error: "Stripe secret key is not configured" });
    }

    // Verify the Stripe session and confirm payment was received.
    // Expand customer + payment_intent.payment_method so wallet payments
    // (Apple Pay / Google Pay / Link) expose their full billing/shipping
    // payload — these often arrive in different fields than manual card entry.
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent", "payment_intent.payment_method", "customer"],
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

    // Compute a single backend base URL for all internal fetches
    const forwardedProto = (req.headers["x-forwarded-proto"] as string) || "";
    const forwardedHost =
      (req.headers["x-forwarded-host"] as string) ||
      (req.headers["host"] as string) ||
      "";
    const BACKEND_URL =
      process.env.BACKEND_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      (forwardedHost
        ? `${forwardedProto || "http"}://${forwardedHost}`
        : "http://127.0.0.1:9000");

    // Sync Stripe-collected customer/shipping details back to the Medusa cart so the order captures them.
    // Wallet payments (Apple Pay / Google Pay / Link) populate slightly different fields than
    // manual card entry. Below we read every plausible source so we never end up with a half-empty
    // address on the order.
    try {
      const publishableKey =
        process.env.MEDUSA_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
        "";

      const sessionData = session as any;
      const details: any = sessionData.customer_details || {};
      const shipping: any =
        sessionData.shipping_details || sessionData.shipping || {};
      const shipAddr: any = shipping.address || {};
      const billAddr: any = details.address || {};
      const customerObj: any =
        typeof sessionData.customer === "object" && sessionData.customer
          ? sessionData.customer
          : {};
      const pm: any = sessionData.payment_intent?.payment_method || {};
      const pmBilling: any = pm.billing_details || {};
      const pmBillAddr: any = pmBilling.address || {};

      // Email: customer_details > top-level customer_email > expanded customer > payment method billing
      const email =
        details.email ||
        sessionData.customer_email ||
        customerObj.email ||
        pmBilling.email ||
        undefined;

      // Phone: customer_details > shipping_details > customer > payment method billing
      const phone =
        details.phone ||
        shipping.phone ||
        customerObj.phone ||
        pmBilling.phone ||
        undefined;

      // Name: shipping_details > customer_details > customer > payment method billing
      const fullName = (
        shipping.name ||
        details.name ||
        customerObj.name ||
        pmBilling.name ||
        ""
      ).trim();
      const [first_name, ...restName] = fullName.split(" ");
      const last_name = restName.join(" ") || undefined;

      const toMedusaAddr = (addr: any, fallbackAddr?: any) => {
        const a = addr && Object.keys(addr).length ? addr : fallbackAddr || {};
        return {
          first_name: first_name || undefined,
          last_name: last_name || undefined,
          address_1: a.line1 || a.line_1 || undefined,
          address_2: a.line2 || a.line_2 || undefined,
          city: a.city || undefined,
          province: a.state || a.region || undefined,
          postal_code: a.postal_code || a.postalCode || undefined,
          country_code: (a.country || "").toString().toLowerCase() || undefined,
          phone: phone || undefined,
        };
      };

      // For wallets, billing address often lives on the payment method, not customer_details
      const shipping_address = toMedusaAddr(shipAddr, billAddr || pmBillAddr);
      const billing_address = toMedusaAddr(billAddr, pmBillAddr || shipAddr);

      console.log(
        `[stripe/success] sync cart ${cart_id} email=${email ? "set" : "MISSING"} phone=${phone ? "set" : "MISSING"} ship_country=${shipping_address.country_code || "MISSING"} ship_postal=${shipping_address.postal_code || "MISSING"} bill_country=${billing_address.country_code || "MISSING"} pm_type=${pm.type || "?"}`,
      );

      const cartUpdate: any = {
        email,
        shipping_address,
        billing_address,
      };
      // Only send keys with truthy values — Medusa's POST /store/carts/:id replaces
      // the whole address object, so partial wallet data must not nuke a good prior address.
      if (!email) delete cartUpdate.email;
      if (!shipping_address.address_1 || !shipping_address.country_code) {
        console.warn(
          `[stripe/success] skipping shipping_address overwrite for cart ${cart_id} — wallet returned incomplete address`,
        );
        delete cartUpdate.shipping_address;
      }
      if (!billing_address.address_1 || !billing_address.country_code) {
        console.warn(
          `[stripe/success] skipping billing_address overwrite for cart ${cart_id} — wallet returned incomplete address`,
        );
        delete cartUpdate.billing_address;
      }

      if (Object.keys(cartUpdate).length) {
        await fetch(
          `${BACKEND_URL}/store/carts/${encodeURIComponent(cart_id)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(publishableKey
                ? { "x-publishable-api-key": publishableKey }
                : {}),
            },
            body: JSON.stringify(cartUpdate),
          },
        ).catch(() => {});
      }
    } catch (syncErr: any) {
      console.warn(
        `[stripe/success] cart sync error for ${cart_id}:`,
        syncErr?.message,
      );
    }

    // Idempotency: if an order already exists for this cart, return it directly
    try {
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
                `${BACKEND_URL}/store/orders?cart_id=${encodeURIComponent(
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

        const intentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as any)?.id;

        // Ensure payment collection exists — create one if the checkout route missed it
        if (!paymentCollectionId) {
          try {
            console.log(
              "[stripe/success] no payment collection found, creating one now",
            );
            const pcResp = await fetch(
              `${BACKEND_URL}/store/payment-collections`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(publishableKey
                    ? { "x-publishable-api-key": publishableKey }
                    : {}),
                },
                body: JSON.stringify({ cart_id }),
              },
            );
            if (pcResp.ok) {
              const pcJson = await pcResp.json();
              paymentCollectionId = pcJson?.payment_collection?.id || null;
              console.log(
                "[stripe/success] created payment collection:",
                paymentCollectionId,
              );
            } else {
              const body = await pcResp.text();
              console.error(
                "[stripe/success] failed to create payment collection",
                {
                  status: pcResp.status,
                  statusText: pcResp.statusText,
                  url: `${BACKEND_URL}/store/payment-collections`,
                  body,
                },
              );
            }
          } catch (pcErr) {
            console.error(
              "[stripe/success] payment collection creation error:",
              (pcErr as any)?.message,
            );
          }
        }

        // Try to authorize the Stripe payment session if we have one
        let authorized = false;
        if (paymentCollectionId && paymentSessionId && intentId) {
          try {
            const paymentModule: any = req.scope.resolve(Modules.PAYMENT);
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
            console.log(
              "[stripe/success] authorized Stripe payment session:",
              paymentSessionId,
            );
          } catch (authErr) {
            console.error(
              "[stripe/success] authorizePaymentSession error:",
              (authErr as any)?.message,
            );
          }
        }

        // Fallback: create a pp_system_default session and authorize it
        // This covers: no Stripe session, authorization failure, or missing payment collection
        if (!authorized && paymentCollectionId) {
          try {
            console.log(
              "[stripe/success] using system default session fallback for collection:",
              paymentCollectionId,
            );
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
                const authResp = await fetch(
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
                if (authResp.ok) {
                  authorized = true;
                  console.log(
                    "[stripe/success] authorized system default session:",
                    manualId,
                  );
                } else {
                  console.error(
                    "[stripe/success] system default authorize failed:",
                    await authResp.text(),
                  );
                }
              }
            } else {
              console.error(
                "[stripe/success] system default session creation failed:",
                await createResp.text(),
              );
            }
          } catch (fallbackErr) {
            console.error(
              "[stripe/success] fallback authorization error:",
              (fallbackErr as any)?.message,
            );
          }
        }

        if (!authorized) {
          console.error(
            "[stripe/success] could not authorize any payment session for cart:",
            cart_id,
          );
        }

        // Ensure the cart has a shipping method — Stripe Checkout collects the
        // shipping address but does not set a Medusa shipping_method, so we
        // pick a default one here before completing the cart.
        await ensureShippingMethod(cart_id, BACKEND_URL, publishableKey);

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
