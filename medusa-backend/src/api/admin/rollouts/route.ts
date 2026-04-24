import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve("query");

  const { data: rollouts } = await query.graph({
    entity: "rollout",
    fields: ["*"],
  });

  res.json({
    rollouts,
  });
}

export async function POST(
  req: MedusaRequest & { body: any },
  res: MedusaResponse,
) {
  const rolloutService = req.scope.resolve("rollout") as any;

  const rollout = await rolloutService.createRollouts(req.body);

  res.json({
    rollout,
  });
}
