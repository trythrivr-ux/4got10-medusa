import SiteSettingsModuleService from "./service";
import { Module } from "@medusajs/framework/utils";

export const SITE_SETTINGS_MODULE = "siteSettings";

export default Module(SITE_SETTINGS_MODULE, {
  service: SiteSettingsModuleService,
});
