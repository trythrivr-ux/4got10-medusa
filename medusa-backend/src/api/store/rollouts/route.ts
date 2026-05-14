import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rolloutModule = req.scope.resolve("rollout");

  try {
    const query = req.scope.resolve("query");

    // Get ALL rollouts (not filtering by announcement date)
    // The frontend will handle the filtering based on announcement_date
    const { data: rollouts } = await query.graph({
      entity: "rollout",
      fields: ["*"],
    });

    // For each rollout, get the full product details
    const rolloutsWithProducts = await Promise.all(
      (rollouts as any[]).map(async (rollout) => {
        const productIds = rollout.product_ids || [];

        if (productIds.length === 0) {
          return {
            ...rollout,
            products: [],
          };
        }

        // Fetch product details for each product ID
        const { data: products } = await query.graph({
          entity: "product",
          fields: ["*", "variants.*", "images.*"],
          filters: {
            id: productIds,
          },
        });

        // Resolve media file URLs (files served via /files/{key} on this backend)
        const backendUrl =
          process.env.BACKEND_URL ||
          process.env.MEDUSA_BACKEND_URL ||
          "http://localhost:9000";
        const mediaIds: string[] = rollout.media || [];
        const media_urls: string[] = mediaIds.map(
          (id: string) => `${backendUrl}/files/${id}`,
        );

        return {
          ...rollout,
          media_urls,
          products: products || [],
        };
      }),
    );

    res.json({ rollouts: rolloutsWithProducts });
  } catch (error) {
    console.error("Failed to fetch rollouts:", error);
    res.status(500).json({ error: "Failed to fetch rollouts" });
  }
}

export const config = {
  authenticate: false,
};
