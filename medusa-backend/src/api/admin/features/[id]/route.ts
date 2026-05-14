import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params;
  const query = req.scope.resolve("query");
  const { data: features } = await query.graph({
    entity: "feature",
    filters: { id },
    fields: ["*"],
    pagination: { take: 1 },
  });
  res.json({ feature: features?.[0] || null });
}

export async function PATCH(
  req: MedusaRequest & { body: any; params: { id: string } },
  res: MedusaResponse,
) {
  const { id } = req.params;
  const featureService = req.scope.resolve("feature") as any;
  const feature = await featureService.updateFeatures({ id, ...req.body });
  res.json({ feature });
}

export async function DELETE(
  req: MedusaRequest & { params: { id: string } },
  res: MedusaResponse,
) {
  const { id } = req.params;
  const featureService = req.scope.resolve("feature") as any;
  await featureService.deleteFeatures([id]);
  res.status(204).send();
}
