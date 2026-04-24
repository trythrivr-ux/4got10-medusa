import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { order_id } = req.body as { order_id: string };

  if (!order_id) {
    return res.status(400).json({ error: "order_id is required" });
  }

  try {
    const emailModule = req.scope.resolve("email");

    // Fetch the full order details using the query service
    const query = req.scope.resolve("query");
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["*", "items.*", "customer.*"],
      filters: { id: order_id },
    });

    const order = Array.isArray(orders) ? orders[0] : orders;

    await emailModule.sendOrderConfirmation({
      to: (order as any).customer?.email || (order as any).email || "",
      orderId: (order as any).id,
      customerName: (order as any).customer?.first_name
        ? `${(order as any).customer.first_name} ${(order as any).customer.last_name || ""}`
        : ((order as any).email || "").split("@")[0],
      items: ((order as any).items || []).map((item: any) => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      total: (order as any).total,
      currency: (order as any).currency_code || "USD",
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
}
