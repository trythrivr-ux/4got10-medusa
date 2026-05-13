import { MedusaService } from "@medusajs/framework/utils";
import { SiteSettings } from "./models/site-settings";

class SiteSettingsModuleService extends MedusaService({
  SiteSettings,
}) {}

export default SiteSettingsModuleService;
