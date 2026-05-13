import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa";

export default async function orderCreatedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  console.log("ORDER CREATED SUBSCRIBER TRIGGERED");

  // Get the specific order ID from the event payload
  const orderId = (event as any)?.data?.id;
  console.log("Order ID from event:", orderId);

  if (!orderId) {
    console.error("No order ID in event data, skipping email");
    return;
  }

  try {
    const emailModule = container.resolve("email");
    const query = container.resolve("query");

    // Fetch the specific order with all needed fields
    const { data: orders } = await query.graph({
      entity: "order",
      filters: { id: orderId },
      fields: [
        "id",
        "display_id",
        "currency_code",
        "total",
        "subtotal",
        "email",
        "items.*",
        "items.title",
        "items.quantity",
        "items.unit_price",
        "items.total",
        "items.thumbnail",
        "items.variant_title",
        "items.variant.title",
        "items.product.thumbnail",
        "customer.*",
        "customer.first_name",
        "customer.last_name",
        "customer.email",
      ],
    });

    const order = Array.isArray(orders) ? orders[0] : orders;
    if (!order) {
      console.error("Order not found:", orderId);
      return;
    }

    const recipientEmail =
      (order as any).customer?.email || (order as any).email || "";
    if (!recipientEmail) {
      console.error("No recipient email for order:", orderId);
      return;
    }

    console.log("Sending confirmation email to:", recipientEmail);

    await emailModule.sendOrderConfirmation({
      to: recipientEmail,
      orderId: (order as any).id,
      customerName: (order as any).customer?.first_name
        ? `${(order as any).customer.first_name} ${(order as any).customer.last_name || ""}`.trim()
        : ((order as any).email || "").split("@")[0],
      items: ((order as any).items || []).map((item: any) => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        thumbnail: item.thumbnail || item.product?.thumbnail || null,
        variant_title: item.variant?.title || item.variant_title || null,
      })),
      total: (order as any).total,
      currency: (order as any).currency_code || "USD",
    });

    console.log("Order confirmation email sent for:", orderId);
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
