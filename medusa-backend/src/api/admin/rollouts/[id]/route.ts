import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(
  req: MedusaRequest & { params: { id: string } },
  res: MedusaResponse,
) {
  const query = req.scope.resolve("query");

  const { data: rollouts } = await query.graph({
    entity: "rollout",
    fields: ["*"],
    filters: { id: req.params.id },
  });

  const rollout = Array.isArray(rollouts) ? rollouts[0] : rollouts;

  res.json({
    rollout,
  });
}

export async function POST(
  req: MedusaRequest & { params: { id: string }; body: any },
  res: MedusaResponse,
) {
  const rolloutService = req.scope.resolve("rollout") as any;

  const rollout = await rolloutService.updateRollouts({
    id: req.params.id,
    ...req.body,
  });

  res.json({
    rollout,
  });
}

export async function DELETE(
  req: MedusaRequest & { params: { id: string } },
  res: MedusaResponse,
) {
  const rolloutService = req.scope.resolve("rollout") as any;

  await rolloutService.deleteRollouts([req.params.id]);

  res.status(204).send();
}
