import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import RolloutModuleService from "../../../modules/rollout/service";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rolloutService: RolloutModuleService =
    req.scope.resolve("rolloutService");

  const rollouts = await rolloutService.listRollouts();

  res.json({
    rollouts,
  });
}

export async function POST(
  req: MedusaRequest & { body: any },
  res: MedusaResponse,
) {
  const rolloutService: RolloutModuleService =
    req.scope.resolve("rolloutService");

  const rollout = await rolloutService.createRollouts(req.body);

  res.json({
    rollout,
  });
}
