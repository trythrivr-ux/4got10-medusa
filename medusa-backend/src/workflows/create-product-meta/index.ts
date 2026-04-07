import { createWorkflow, transform, when, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ProductDTO } from "@medusajs/framework/types"
import { createProductMetaStep } from "./steps/create-product-meta"
import { PRODUCT_META_MODULE } from "../../modules/product_meta"

export type CreateProductMetaWorkflowInput = {
  product: ProductDTO
  additional_data?: {
    drop_date?: string | null
    sold_out_date?: string | null
  }
}

const createProductMetaLinkStep = createStep(
  "create-product-meta-link",
  async ({ productId, productMetaId }: { productId: string; productMetaId: string }, { container }) => {
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    
    await link.create({
      [Modules.PRODUCT]: {
        product_id: productId,
      },
      [PRODUCT_META_MODULE]: {
        product_meta_id: productMetaId,
      },
    })
    
    return new StepResponse({ productId, productMetaId }, { productId, productMetaId })
  },
  async (input, { container }) => {
    if (!input) {
      return
    }
    
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    
    await link.dismiss({
      [Modules.PRODUCT]: {
        product_id: input.productId,
      },
      [PRODUCT_META_MODULE]: {
        product_meta_id: input.productMetaId,
      },
    })
  }
)

export const createProductMetaWorkflow = createWorkflow(
  "create-product-meta",
  (input: CreateProductMetaWorkflowInput) => {
    const metaInput = transform(
      { input },
      (data) => {
        const additionalData = data.input.additional_data || {}
        
        return {
          productId: data.input.product.id,
          drop_date: additionalData.drop_date 
            ? new Date(additionalData.drop_date) 
            : null,
          sold_out_date: additionalData.sold_out_date 
            ? new Date(additionalData.sold_out_date) 
            : null,
        }
      }
    )

    const productMeta = createProductMetaStep(metaInput)

    // Only create link if it was a new product_meta (not an update)
    when(({ productMeta }), ({ productMeta }) => productMeta !== undefined && !productMeta.wasExisting)
      .then(() => {
        createProductMetaLinkStep({
          productId: input.product.id,
          productMetaId: productMeta.id,
        })
      })

    return new WorkflowResponse({
      productMeta,
    })
  }
)
