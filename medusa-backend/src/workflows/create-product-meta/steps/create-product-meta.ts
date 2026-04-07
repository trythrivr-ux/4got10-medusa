import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import ProductMetaModuleService from "../../../modules/product_meta/service"
import { PRODUCT_META_MODULE } from "../../../modules/product_meta"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type CreateProductMetaStepInput = {
  productId: string
  drop_date?: Date | null
  sold_out_date?: Date | null
}

type ProductMetaResult = {
  id: string
  drop_date: Date | null
  sold_out_date: Date | null
  wasExisting: boolean
}

export const createProductMetaStep = createStep(
  "create-product-meta",
  async (data: CreateProductMetaStepInput, { container }) => {
    console.log("createProductMetaStep called with:", JSON.stringify(data, null, 2))
    
    const productMetaService: ProductMetaModuleService = container.resolve(
      PRODUCT_META_MODULE
    )
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Find existing product_meta linked to this product
    const { data: linkedProducts } = await query.graph({
      entity: "product",
      fields: ["product_meta.id"],
      filters: {
        id: data.productId,
      },
    })
    
    console.log("Linked products query result:", JSON.stringify(linkedProducts, null, 2))

    const existingMetaId = linkedProducts[0]?.product_meta?.id

    let productMeta: ProductMetaResult

    if (existingMetaId) {
      console.log("Updating existing meta:", existingMetaId)
      const updated = await productMetaService.updateProductMetas({
        id: existingMetaId,
        drop_date: data.drop_date ?? null,
        sold_out_date: data.sold_out_date ?? null,
      })
      productMeta = {
        ...updated,
        wasExisting: true,
      }
    } else {
      console.log("Creating new meta")
      const created = await productMetaService.createProductMetas({
        drop_date: data.drop_date ?? null,
        sold_out_date: data.sold_out_date ?? null,
      })
      productMeta = {
        ...created,
        wasExisting: false,
      }
    }
    
    console.log("ProductMeta result:", JSON.stringify(productMeta, null, 2))

    return new StepResponse(productMeta, { id: productMeta.id, wasExisting: productMeta.wasExisting })
  },
  async (productMeta, { container }) => {
    if (!productMeta || productMeta.wasExisting) {
      return
    }

    const productMetaService: ProductMetaModuleService = container.resolve(
      PRODUCT_META_MODULE
    )

    await productMetaService.deleteProductMetas(productMeta.id)
  }
)
