import { MedusaService } from "@medusajs/framework/utils";
import { Rollout } from "./models/rollout";

class RolloutModuleService extends MedusaService({
  Rollout,
}) {}

export default RolloutModuleService;
