import { createOrderWorkflow } from "@medusajs/medusa/core-flows";

console.log("ORDER HOOK FILE LOADED");

createOrderWorkflow.hooks.orderCreated(async ({ order }, { container }) => {
  console.log("ORDER CREATED HOOK TRIGGERED - Order ID:", order.id);
  console.log("Order email:", order.email);
  console.log("Order customer email:", order.customer?.email);
  console.log(
    "Order customer object:",
    JSON.stringify(order.customer, null, 2),
  );

  try {
    const emailModule = container.resolve("email");
    console.log("Email module resolved successfully");

    const recipientEmail = order.customer?.email || order.email;
    console.log("Using recipient email:", recipientEmail);

    await emailModule.sendOrderConfirmation({
      to: recipientEmail,
      orderId: order.id,
      customerName: order.customer?.first_name
        ? `${order.customer.first_name} ${order.customer.last_name || ""}`
        : order.email.split("@")[0],
      items: order.items.map((item: any) => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        thumbnail:
          item.thumbnail ||
          item.product?.thumbnail ||
          item.product?.images?.[0]?.url ||
          null,
        variant_title:
          item.variant?.title || (item as any)?.variant_title || null,
      })),
      total: order.total,
      currency: order.currency_code,
    });
    console.log("Order confirmation email sent successfully");
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
    // Don't throw - we don't want to fail the order creation if email fails
  }
});
