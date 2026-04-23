import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import RolloutModuleService from "../../../../modules/rollout/service";

export async function GET(
  req: MedusaRequest & { params: { id: string } },
  res: MedusaResponse
) {
  const rolloutService: RolloutModuleService = req.scope.resolve("rolloutService");
  
  const rollout = await rolloutService.retrieveRollout(req.params.id);
  
  res.json({
    rollout,
  });
}

export async function POST(
  req: MedusaRequest & { params: { id: string }, body: any },
  res: MedusaResponse
) {
  const rolloutService: RolloutModuleService = req.scope.resolve("rolloutService");
  
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
  res: MedusaResponse
) {
  const rolloutService: RolloutModuleService = req.scope.resolve("rolloutService");
  
  await rolloutService.deleteRollouts(req.params.id);
  
  res.status(204).send();
}
