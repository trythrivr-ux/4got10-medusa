import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";

// GET /custom/orders/by-id/:id
// Returns the order by internal id using Medusa Query (no publishable key needed)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const p: any = (req as any).params || req.params || {};
    let id: string | undefined = p.id;
    if (!id) {
      const path: string = (req as any).path || (req as any).url || "";
      const seg = path.split("/").filter(Boolean).pop();
      id = seg;
    }
    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    const query = req.scope.resolve("query") as any;
    const { data: orders } = await query.graph({
      entity: "order",
      filters: { id },
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

    const order = Array.isArray(orders) ? orders[0] : null;
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(200).json({ order });
  } catch (e: any) {
    try {
      req.scope?.resolve("logger")?.error("orders_by_id_error", e);
    } catch {}
    return res
      .status(500)
      .json({ error: e?.message || "Failed to fetch order by id" });
  }
};
