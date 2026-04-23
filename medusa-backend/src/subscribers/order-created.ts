import { SubscriberArgs, SubscriberConfig } from "@medusajs/medusa";

export default async function orderCreatedHandler({ container }: any) {
  console.log("ORDER CREATED SUBSCRIBER TRIGGERED");

  try {
    const emailModule = container.resolve("email");
    console.log("Email module resolved successfully");

    // Fetch the most recent order since event data is undefined in Medusa v2
    const query = container.resolve("query");
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["*", "items.*", "customer.*"],
      options: {
        order: { created_at: "DESC" },
        limit: 1,
      },
    });

    const order = Array.isArray(orders) ? orders[0] : orders;

    if (!order) {
      console.error("No recent order found");
      return;
    }

    console.log("Fetched order:", order.id, "currency:", order.currency_code);

    await emailModule.sendOrderConfirmation({
      to: (order as any).email || "",
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
    console.log("Order confirmation email sent successfully");
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    // Don't throw - we don't want to fail the order creation if email fails
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
