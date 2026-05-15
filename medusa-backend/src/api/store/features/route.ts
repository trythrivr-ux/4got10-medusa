import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve("query")
  const { product_id } = req.query

  const filters: any = {}
  if (product_id) {
    filters.product_id = product_id
  }

  const { data: features } = await query.graph({
    entity: "feature",
    fields: ["*"],
    filters,
  })

  res.json({ features })
}
