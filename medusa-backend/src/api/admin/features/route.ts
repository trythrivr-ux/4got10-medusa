import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve("query")

  const { data: features } = await query.graph({
    entity: "feature",
    fields: ["*"],
  })

  res.json({ features })
}

export async function POST(
  req: MedusaRequest & { body: any },
  res: MedusaResponse
) {
  const featureService = req.scope.resolve("feature") as any

  const feature = await featureService.createFeatures(req.body)

  res.json({ feature })
}
