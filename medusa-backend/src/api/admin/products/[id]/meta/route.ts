import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_META_MODULE } from "../../../../../modules/product_meta"
import ProductMetaModuleService from "../../../../../modules/product_meta/service"

type ProductMetaInput = {
  drop_date?: string | null
  sold_out_date?: string | null
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const productId = req.params.id
  
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  
  // Use Query API to fetch product with linked product_meta
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["product_meta.id", "product_meta.drop_date", "product_meta.sold_out_date"],
    filters: {
      id: productId,
    },
  })
  
  const product = products[0]
  
  if (!product || !product.product_meta) {
    return res.json({ product_meta: null })
  }
  
  res.json({ product_meta: product.product_meta })
}

export async function POST(
  req: MedusaRequest<ProductMetaInput>,
  res: MedusaResponse
) {
  const productId = req.params.id
  const { drop_date, sold_out_date } = req.body
  
  console.log("POST /meta - productId:", productId, "body:", req.body)
  
  const productMetaService: ProductMetaModuleService = req.scope.resolve(PRODUCT_META_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)
  
  // Find existing product_meta linked to this product
  const { data: linkedProducts } = await query.graph({
    entity: "product",
    fields: ["product_meta.id"],
    filters: {
      id: productId,
    },
  })
  
  const existingMetaId = linkedProducts[0]?.product_meta?.id
  
  let productMeta
  
  if (existingMetaId) {
    // Update existing
    console.log("Updating existing meta:", existingMetaId)
    productMeta = await productMetaService.updateProductMetas({
      id: existingMetaId,
      drop_date: drop_date ? new Date(drop_date) : null,
      sold_out_date: sold_out_date ? new Date(sold_out_date) : null,
    })
  } else {
    // Create new
    console.log("Creating new meta")
    productMeta = await productMetaService.createProductMetas({
      drop_date: drop_date ? new Date(drop_date) : null,
      sold_out_date: sold_out_date ? new Date(sold_out_date) : null,
    })
    
    // Create link
    await link.create({
      [Modules.PRODUCT]: {
        product_id: productId,
      },
      [PRODUCT_META_MODULE]: {
        product_meta_id: productMeta.id,
      },
    })
  }
  
  console.log("Saved productMeta:", productMeta)
  
  res.json({ product_meta: productMeta })
}
