import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { createProductMetaWorkflow, CreateProductMetaWorkflowInput } from "../create-product-meta"

createProductsWorkflow.hooks.productsCreated(
  async ({ products, additional_data }, { container }) => {
    const workflow = createProductMetaWorkflow(container)

    for (const product of products) {
      await workflow.run({
        input: {
          product,
          additional_data,
        } as CreateProductMetaWorkflowInput,
      })
    }
  }
)
