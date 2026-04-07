import { defineLink } from "@medusajs/framework/utils"
import ProductMetaModule from "../modules/product_meta"
import ProductModule from "@medusajs/medusa/product"

export default defineLink(
  ProductModule.linkable.product,
  ProductMetaModule.linkable.productMeta
)
