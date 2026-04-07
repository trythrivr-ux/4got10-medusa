import { MedusaService } from "@medusajs/framework/utils"
import { ProductMeta } from "./models/product-meta"

class ProductMetaModuleService extends MedusaService({
  ProductMeta,
}){
}

export default ProductMetaModuleService
