import { model } from "@medusajs/framework/utils"

export const ProductMeta = model.define("product_meta", {
  id: model.id().primaryKey(),
  // Drop date: shows countdown until this time, then reveals add to cart
  drop_date: model.dateTime().nullable(),
  // Sold out date: shows "Sold Out" from this date onwards
  sold_out_date: model.dateTime().nullable(),
})
