import { MedusaService } from "@medusajs/framework/utils"
import { Feature } from "./models/feature"

class FeatureModuleService extends MedusaService({
  Feature,
}) {}

export default FeatureModuleService
