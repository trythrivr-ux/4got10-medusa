import { model } from "@medusajs/framework/utils";

export const Rollout = model.define("rollout", {
  id: model.id().primaryKey(),
  name: model.text(),
  // Linked products - stored as JSON array of product IDs
  product_ids: model.json().nullable(),
  // Announcement date (Reveal)
  announcement_date: model.dateTime().nullable(),
  // Drop date
  drop_date: model.dateTime().nullable(),
  // Sold-out date (Optional)
  sold_out_date: model.dateTime().nullable(),
  // Media - will store file IDs from Medusa's file module
  media: model.json().nullable(),
  // Features - Excel sheet data (JSON representation)
  features: model.json().nullable(),
  // Headliner text field
  headliner: model.text().nullable(),
  // Headliner media - file IDs
  headliner_media: model.json().nullable(),
  // Rollout description
  description: model.text().nullable(),
});

export const RolloutProduct = model.define("rollout_product", {
  id: model.id().primaryKey(),
  rollout: model.belongsTo(() => Rollout, {
    mappedBy: "products",
  }),
  product_id: model.text(),
});
