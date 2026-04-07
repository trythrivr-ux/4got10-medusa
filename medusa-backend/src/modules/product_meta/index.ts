import ProductMetaModuleService from "./service"
import { ProductMeta } from "./models/product-meta"
import { Module } from "@medusajs/framework/utils"

export const PRODUCT_META_MODULE = "product_meta"

export default Module(PRODUCT_META_MODULE, {
  service: ProductMetaModuleService,
})
