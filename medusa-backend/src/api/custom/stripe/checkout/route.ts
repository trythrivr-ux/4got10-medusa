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

    // Ensure the cart has an initialized payment collection with a Stripe payment session
    // This is required so completeCartWorkflow can succeed after Stripe returns
    const BACKEND_URL =
      process.env.BACKEND_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      "http://localhost:9000";
    const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY || "";

    // Try to read current payment collection from provided cart or fetch minimal cart info
    let paymentCollectionId: string | null =
      providedCart?.payment_collection?.id || null;
    let hasStripeSession = false;
    try {
      if (!paymentCollectionId) {
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
            hasStripeSession = Array.isArray(pc.payment_sessions)
              ? pc.payment_sessions.some(
                  (s: any) => s?.provider_id === "pp_stripe_stripe",
                )
              : false;
          }
        }
      } else {
        hasStripeSession = Array.isArray(
          providedCart?.payment_collection?.payment_sessions,
        )
          ? providedCart.payment_collection.payment_sessions.some(
              (s: any) => s?.provider_id === "pp_stripe_stripe",
            )
          : false;
      }
    } catch {}

    // Create payment collection if missing
    try {
      if (!paymentCollectionId) {
        const pcResp = await fetch(`${BACKEND_URL}/store/payment-collections`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(publishableKey
              ? { "x-publishable-api-key": publishableKey }
              : {}),
          },
          body: JSON.stringify({ cart_id }),
        });
        if (pcResp.ok) {
          const pcJson = await pcResp.json();
          paymentCollectionId = pcJson?.payment_collection?.id || null;
        }
      }
    } catch {}

    // Create Stripe payment session for collection if missing
    try {
      if (paymentCollectionId && !hasStripeSession) {
        await fetch(
          `${BACKEND_URL}/store/payment-collections/${paymentCollectionId}/payment-sessions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(publishableKey
                ? { "x-publishable-api-key": publishableKey }
                : {}),
            },
            body: JSON.stringify({ provider_id: "pp_stripe_stripe" }),
          },
        );
      }
    } catch {}

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
    console.log(
      `[stripe/checkout] mode=${stripeMode} key_prefix=${STRIPE_SECRET_KEY?.slice(0, 12)}...`,
    );
    if (!STRIPE_SECRET_KEY) {
      return res
        .status(500)
        .json({ error: "Stripe secret key is not configured" });
    }

    // BACKEND_URL already defined above

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

    // Build allowed shipping countries from region so customer can choose (filter to Stripe-supported ISO codes)
    const stripeSupported = new Set([
      "AC",
      "AD",
      "AE",
      "AF",
      "AG",
      "AI",
      "AL",
      "AM",
      "AO",
      "AQ",
      "AR",
      "AT",
      "AU",
      "AW",
      "AX",
      "AZ",
      "BA",
      "BB",
      "BD",
      "BE",
      "BF",
      "BG",
      "BH",
      "BI",
      "BJ",
      "BL",
      "BM",
      "BN",
      "BO",
      "BQ",
      "BR",
      "BS",
      "BT",
      "BV",
      "BW",
      "BY",
      "BZ",
      "CA",
      "CD",
      "CF",
      "CG",
      "CH",
      "CI",
      "CK",
      "CL",
      "CM",
      "CN",
      "CO",
      "CR",
      "CV",
      "CW",
      "CY",
      "CZ",
      "DE",
      "DJ",
      "DK",
      "DM",
      "DO",
      "DZ",
      "EC",
      "EE",
      "EG",
      "EH",
      "ER",
      "ES",
      "ET",
      "FI",
      "FJ",
      "FK",
      "FO",
      "FR",
      "GA",
      "GB",
      "GD",
      "GE",
      "GF",
      "GG",
      "GH",
      "GI",
      "GL",
      "GM",
      "GN",
      "GP",
      "GQ",
      "GR",
      "GS",
      "GT",
      "GU",
      "GW",
      "GY",
      "HK",
      "HN",
      "HR",
      "HT",
      "HU",
      "ID",
      "IE",
      "IL",
      "IM",
      "IN",
      "IO",
      "IQ",
      "IS",
      "IT",
      "JE",
      "JM",
      "JO",
      "JP",
      "KE",
      "KG",
      "KH",
      "KI",
      "KM",
      "KN",
      "KR",
      "KW",
      "KY",
      "KZ",
      "LA",
      "LB",
      "LC",
      "LI",
      "LK",
      "LR",
      "LS",
      "LT",
      "LU",
      "LV",
      "LY",
      "MA",
      "MC",
      "MD",
      "ME",
      "MF",
      "MG",
      "MK",
      "ML",
      "MM",
      "MN",
      "MO",
      "MQ",
      "MR",
      "MS",
      "MT",
      "MU",
      "MV",
      "MW",
      "MX",
      "MY",
      "MZ",
      "NA",
      "NC",
      "NE",
      "NG",
      "NI",
      "NL",
      "NO",
      "NP",
      "NR",
      "NU",
      "NZ",
      "OM",
      "PA",
      "PE",
      "PF",
      "PG",
      "PH",
      "PK",
      "PL",
      "PM",
      "PN",
      "PR",
      "PS",
      "PT",
      "PY",
      "QA",
      "RE",
      "RO",
      "RS",
      "RU",
      "RW",
      "SA",
      "SB",
      "SC",
      "SD",
      "SE",
      "SG",
      "SH",
      "SI",
      "SJ",
      "SK",
      "SL",
      "SM",
      "SN",
      "SO",
      "SR",
      "SS",
      "ST",
      "SV",
      "SX",
      "SZ",
      "TA",
      "TC",
      "TD",
      "TF",
      "TG",
      "TH",
      "TJ",
      "TK",
      "TL",
      "TM",
      "TN",
      "TO",
      "TR",
      "TT",
      "TV",
      "TW",
      "TZ",
      "UA",
      "UG",
      "US",
      "UY",
      "UZ",
      "VA",
      "VC",
      "VE",
      "VG",
      "VN",
      "VU",
      "WF",
      "WS",
      "XK",
      "YE",
      "YT",
      "ZA",
      "ZM",
      "ZW",
      "ZZ",
    ]);
    let allowedCountries: string[] = [];
    try {
      const regionCountries = Array.isArray(cart?.region?.countries)
        ? cart.region.countries
        : [];
      allowedCountries = regionCountries
        .map((c: any) =>
          (c?.iso_2 || c?.iso2 || c?.code || "").toString().toUpperCase(),
        )
        .filter((c: string) => !!c && c.length === 2 && stripeSupported.has(c));
      allowedCountries = Array.from(new Set(allowedCountries));
    } catch {}
    // Fallback shortlist if region countries are unavailable
    if (!allowedCountries.length) {
      allowedCountries = [
        "US",
        "DK",
        "DE",
        "SE",
        "NO",
        "GB",
        "FR",
        "NL",
        "BE",
        "IT",
        "ES",
        "PT",
        "IE",
        "AT",
        "CH",
        "PL",
      ].filter((c) => stripeSupported.has(c));
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      success_url: `${successBase}/api/checkout/complete?session_id={CHECKOUT_SESSION_ID}&country=${countryCode}`,
      // Redirect back to the localized cart page when customer cancels from Stripe
      cancel_url: `${successBase}/${countryCode}/cart`,
      customer_email: cart.email || undefined,
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      shipping_address_collection: {
        allowed_countries: allowedCountries as any,
      },
      customer_creation: "always",
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
