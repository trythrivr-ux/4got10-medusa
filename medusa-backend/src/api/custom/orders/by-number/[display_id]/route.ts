import type { MedusaRequest, MedusaResponse } from "@medusajs/framework";

// GET /custom/orders/by-number/:display_id
// Returns the order associated with a display_id (order number),
// proxied through the server using the publishable key header.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const p: any = (req as any).params || req.params || {};
    let displayId: string | undefined = p.display_id;
    if (!displayId) {
      const path: string = (req as any).path || (req as any).url || "";
      const seg = path.split("/").filter(Boolean).pop();
      displayId = seg;
    }
    if (!displayId) {
      return res.status(400).json({ error: "display_id is required" });
    }

    const BACKEND_URL =
      process.env.BACKEND_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      "http://localhost:9000";
    const publishableKey =
      process.env.MEDUSA_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
      "";

    const resp = await fetch(
      `${BACKEND_URL}/store/orders?display_id=${encodeURIComponent(displayId)}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
        },
        cache: "no-store",
      },
    );

    if (!resp.ok) {
      return res.status(resp.status).json({ error: "Order lookup failed" });
    }

    const json = await resp.json();
    const order = Array.isArray(json?.orders) ? json.orders[0] : json?.order || null;

    if (!order) {
      return res.status(404).json({ error: "Order not found for display_id" });
    }

    return res.status(200).json({ order });
  } catch (e: any) {
    try {
      req.scope?.resolve("logger")?.error("orders_by_display_id_error", e);
    } catch {}
    return res
      .status(500)
      .json({ error: e?.message || "Failed to fetch order by display_id" });
  }
};
