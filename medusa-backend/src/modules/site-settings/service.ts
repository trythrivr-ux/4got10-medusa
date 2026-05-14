import { MedusaService } from "@medusajs/framework/utils";
import { SiteSetting } from "./models/site-settings";

class SiteSettingsModuleService extends MedusaService({
  SiteSetting,
}) {}

export default SiteSettingsModuleService;
