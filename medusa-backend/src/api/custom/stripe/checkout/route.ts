import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import Stripe from "stripe";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

// POST /custom/stripe/checkout
// Body: { cart_id: string }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { cart_id, cart: providedCart } = (req.body || {}) as {
      cart_id?: string;
      cart?: any;
    };
    if (!cart_id) {
      return res.status(400).json({ error: "cart_id is required" });
    }

    // Determine Stripe mode (test/live) from a shared tmp file written by admin route
    const tmpPath = path.join(os.tmpdir(), "4got10-stripe-mode.json");
    let stripeMode: "test" | "live" = "test";
    try {
      const raw = await fs.readFile(tmpPath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.mode === "live") stripeMode = "live";
    } catch {}

    const secretFromEnv =
      stripeMode === "test"
        ? process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
        : process.env.STRIPE_SECRET_KEY;

    const STRIPE_SECRET_KEY = secretFromEnv;
    if (!STRIPE_SECRET_KEY) {
      return res
        .status(500)
        .json({ error: "Stripe secret key is not configured" });
    }

    const BACKEND_URL =
      process.env.BACKEND_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      "http://localhost:9000";

    // Prefer provided snapshot, otherwise fetch via Store API
    let cart: any = providedCart;
    if (!cart) {
      const cartResp = await fetch(`${BACKEND_URL}/store/carts/${cart_id}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!cartResp.ok) {
        return res
          .status(cartResp.status)
          .json({ error: "Failed to fetch cart" });
      }
      const json = (await cartResp.json()) as any;
      cart = json?.cart;
    }
    if (!cart || !cart.items?.length) {
      return res.status(400).json({ error: "Cart is empty or invalid" });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const successBase =
      process.env.STOREFRONT_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:8000";

    const currency = cart.region?.currency_code || "usd";
    // Try to infer a locale/country prefix for storefront routes
    const countryCode =
      cart?.shipping_address?.country_code ||
      cart?.region?.countries?.[0]?.iso_2 ||
      cart?.region?.country_code ||
      "us";
    const backendBase =
      process.env.BACKEND_PUBLIC_URL ||
      process.env.BACKEND_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      "http://localhost:9000";
    const toAbsolute = (url?: string) => {
      if (!url) return undefined;
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith("/")) return `${backendBase}${url}`;
      return url;
    };
    const line_items = cart.items.map((item: any) => {
      const qty = Math.max(1, item?.quantity || 1);
      const candidate = Number.isFinite(item?.unit_price)
        ? Number(item.unit_price)
        : undefined;
      const fallbackEach = Number.isFinite(item?.total)
        ? Number(item.total) / qty
        : undefined;
      // Convert to minor units (e.g., cents)
      const candidateCents =
        typeof candidate === "number" ? Math.round(candidate * 100) : undefined;
      const fallbackCents =
        typeof fallbackEach === "number"
          ? Math.round(fallbackEach * 100)
          : undefined;
      const unit_amount =
        typeof candidateCents === "number" && candidateCents > 0
          ? candidateCents
          : typeof fallbackCents === "number" && fallbackCents > 0
            ? fallbackCents
            : 1; // Stripe requires >= 1 (minor units)

      const img =
        toAbsolute(item?.thumbnail) ||
        toAbsolute(item?.product?.thumbnail) ||
        toAbsolute(
          Array.isArray(item?.product?.images)
            ? item.product.images[0]?.url
            : undefined,
        );

      return {
        price_data: {
          currency,
          product_data: {
            name: item.title || item?.product?.title || "Product",
            images: img ? [img] : undefined,
          },
          unit_amount,
        },
        quantity: qty,
      };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      success_url: `${successBase}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      // Redirect back to the localized cart page when customer cancels from Stripe
      cancel_url: `${successBase}/${countryCode}/cart`,
      customer_email: cart.email || undefined,
      metadata: {
        cart_id,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (e: any) {
    req.scope?.resolve("logger")?.error("stripe_checkout_error", e);
    const message =
      e?.raw?.message || e?.message || "Failed to create checkout session";
    const status = Number.isFinite(e?.statusCode) ? e.statusCode : 500;
    return res.status(status as number).json({ error: message });
  }
};
