import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve("query");
  const now = new Date();

  try {
    // Get all rollouts with sold_out_date that has passed
    const { data: rollouts } = await query.graph({
      entity: "rollout",
      fields: ["*"],
    });

    const expiredRollouts = (rollouts as any[]).filter(
      (rollout) => rollout.sold_out_date && new Date(rollout.sold_out_date) <= now
    );

    if (expiredRollouts.length === 0) {
      return res.json({ message: "No rollouts with expired sold-out dates found." });
    }

    console.log(`Found ${expiredRollouts.length} rollouts with expired sold-out dates.`);

    // For each expired rollout, get all carts containing the products and remove them
    for (const rollout of expiredRollouts) {
      const productIds = rollout.product_ids || [];
      
      if (productIds.length === 0) {
        continue;
      }

      // Get all carts containing these products
      const { data: carts } = await query.graph({
        entity: "cart",
        fields: ["*", "items.*"],
      });

      const cartsWithProducts = (carts as any[]).filter((cart) =>
        cart.items?.some((item: any) => productIds.includes(item.product_id))
      );

      console.log(`Found ${cartsWithProducts.length} carts containing products from rollout ${rollout.id}`);

      // Remove the products from each cart using the cart service
      const cartService = req.scope.resolve("cart");
      
      for (const cart of cartsWithProducts) {
        const itemsToRemove = cart.items.filter((item: any) =>
          productIds.includes(item.product_id)
        );

        if (itemsToRemove.length > 0) {
          try {
            await cartService.deleteLineItems(cart.id, itemsToRemove.map((item: any) => item.id));
            console.log(`Removed ${itemsToRemove.length} items from cart ${cart.id}`);
          } catch (error) {
            console.error(`Failed to remove items from cart ${cart.id}:`, error);
          }
        }
      }
    }

    res.json({ message: "Sold-out date check completed successfully." });
  } catch (error) {
    console.error("Error checking sold-out dates:", error);
    res.status(500).json({ error: "Failed to check sold-out dates" });
  }
}
