import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

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
