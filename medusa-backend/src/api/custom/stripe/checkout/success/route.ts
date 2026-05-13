import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import Stripe from "stripe"

// POST /custom/stripe/checkout/success
// Body: { session_id: string }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { session_id } = (req.body || {}) as { session_id?: string }
    if (!session_id) {
      return res.status(400).json({ error: "session_id is required" })
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
    if (!STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Stripe secret key is not configured" })
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent", "customer"],
    })

    const cart_id = (session.metadata as any)?.cart_id
    if (!cart_id) {
      return res.status(422).json({ error: "This session has no cart_id metadata." })
    }

    const BACKEND_URL = process.env.BACKEND_URL || process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

    // Try to find the order via Store API using the cart id
    const orderResp = await fetch(`${BACKEND_URL}/store/orders?cart_id=${encodeURIComponent(cart_id)}`, {
      headers: { "Content-Type": "application/json" },
    })

    if (!orderResp.ok) {
      return res.status(202).json({
        status: "pending",
        message: "Order not found yet. It may be awaiting Stripe webhook processing.",
        cart_id,
        session_id,
      })
    }

    const orderList = (await orderResp.json()) as any
    const order = Array.isArray(orderList?.orders) ? orderList.orders[0] : orderList?.order || null

    if (!order) {
      return res.status(202).json({
        status: "pending",
        message: "Order not found yet. It may be awaiting Stripe webhook processing.",
        cart_id,
        session_id,
      })
    }

    // Fire order confirmation email (best-effort)
    try {
      await fetch(`${BACKEND_URL}/store/send-order-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id }),
      })
    } catch {}

    return res.status(200).json({ status: "confirmed", order })
  } catch (e: any) {
    req.scope?.resolve("logger")?.error("stripe_checkout_success_error", e)
    return res.status(500).json({ error: e?.message || "Failed to resolve checkout success" })
  }
}
