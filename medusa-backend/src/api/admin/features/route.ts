import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve("query");
  const { product_id } = req.query;

  const filters: any = {};
  if (product_id) {
    filters.product_id = product_id;
  }

  const { data: features } = await query.graph({
    entity: "feature",
    fields: ["*"],
    filters,
  });

  res.json({ features });
}

export async function POST(
  req: MedusaRequest & { body: any },
  res: MedusaResponse,
) {
  console.log(
    "POST /admin/features - Request body:",
    JSON.stringify(req.body, null, 2),
  );

  const featureService = req.scope.resolve("feature") as any;

  const { Feature } = req.body;
  if (!Feature || !Array.isArray(Feature) || Feature.length === 0) {
    console.log("POST /admin/features - Invalid request body");
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const featureData = Feature[0];
  console.log(
    "POST /admin/features - Feature data:",
    JSON.stringify(featureData, null, 2),
  );
  console.log("POST /admin/features - product_id:", featureData.product_id);

  if (!featureData.product_id || featureData.product_id === "") {
    console.log("POST /admin/features - Missing product_id");
    res.status(400).json({ error: "product_id is required" });
    return;
  }

  // MedusaService expects data directly, not wrapped in entity name
  const feature = await featureService.createFeatures(featureData);

  res.json({ feature });
}

export async function PATCH(
  req: MedusaRequest & { body: any },
  res: MedusaResponse,
) {
  console.log(
    "PATCH /admin/features - Request body:",
    JSON.stringify(req.body, null, 2),
  );

  const featureService = req.scope.resolve("feature") as any;

  const { Feature } = req.body;
  if (!Feature || !Array.isArray(Feature) || Feature.length === 0) {
    console.log("PATCH /admin/features - Invalid request body");
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  // Update each feature using the service
  const updatedFeatures: any[] = [];
  for (const featureData of Feature) {
    console.log(
      "PATCH /admin/features - Updating feature:",
      JSON.stringify(featureData, null, 2),
    );

    try {
      const updated = await featureService.updateFeatures(featureData);
      updatedFeatures.push(updated);
    } catch (error) {
      console.error("PATCH /admin/features - Error updating feature:", error);
    }
  }

  res.json({ features: updatedFeatures });
}
