import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";

// GET /custom/orders/by-cart/:id
// Returns the order associated with a cart_id using internal query (no publishable key required)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const p: any = (req as any).params || req.params || {};
    let cartId: string | undefined = p.id;
    if (!cartId) {
      const path: string = (req as any).path || (req as any).url || "";
      const seg = path.split("/").filter(Boolean).pop();
      cartId = seg;
    }
    if (!cartId && (req as any).query?.id) {
      cartId = (req as any).query.id as string;
    }
    if (!cartId) {
      return res.status(400).json({ error: "cart_id is required" });
    }

    const query = req.scope.resolve("query") as any;

    // In Medusa v2 the cart→order relationship is stored as a remote link.
    // Traverse it by requesting order.* fields on the cart entity.
    const { data: carts } = await query.graph({
      entity: "cart",
      filters: { id: cartId },
      fields: [
        "id",
        "order.id",
        "order.display_id",
        "order.status",
        "order.payment_status",
        "order.fulfillment_status",
        "order.currency_code",
        "order.subtotal",
        "order.tax_total",
        "order.shipping_total",
        "order.total",
        "order.email",
        "order.items.*",
        "order.items.title",
        "order.items.quantity",
        "order.items.unit_price",
        "order.items.total",
        "order.items.thumbnail",
        "order.shipping_address.*",
        "order.billing_address.*",
        "order.customer.*",
      ],
    });

    const cart = Array.isArray(carts) ? carts[0] : carts;
    const order =
      cart?.order ?? (Array.isArray(cart?.order) ? cart.order[0] : null);

    if (!order) {
      return res.status(404).json({ error: "Order not found for cart" });
    }

    return res.status(200).json({ order });
  } catch (e: any) {
    try {
      req.scope?.resolve("logger")?.error("orders_by_cart_error", e);
    } catch {}
    return res
      .status(500)
      .json({ error: e?.message || "Failed to fetch order by cart" });
  }
};
