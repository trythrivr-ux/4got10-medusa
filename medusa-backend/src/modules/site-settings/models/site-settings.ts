import { model } from "@medusajs/framework/utils";

export const SiteSetting = model.define("site_settings", {
  id: model.id().primaryKey(),
  locked: model.boolean().default(false),
  checkout_mode: model.text().default("standard"),
  stripe_mode: model.text().default("test"),
});
