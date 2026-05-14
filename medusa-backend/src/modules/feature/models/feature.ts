import { model } from "@medusajs/framework/utils"

export const Feature = model.define("feature", {
  id: model.id().primaryKey(),
  // Attached product (single product id)
  product_id: model.text(),
  // Name of feature (e.g. Young Thug)
  name: model.text(),
  // Industry category (free text; UI will suggest common values)
  industry_category: model.text(),
  // Attached photo file id
  photo_file_id: model.text().nullable(),
  // Attached photo of feature in action
  action_photo_file_id: model.text().nullable(),
  // Optional metadata
  metadata: model.json().nullable(),
})
