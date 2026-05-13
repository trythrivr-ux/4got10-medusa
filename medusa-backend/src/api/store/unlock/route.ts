import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { password } = req.body as { password?: string }

  const expected = process.env.PREVIEW_PASSWORD

  if (!expected) {
    return res
      .status(503)
      .json({ success: false, error: "Preview password not configured on server." })
  }

  if (!password || password !== expected) {
    return res.status(401).json({ success: false, error: "Incorrect password." })
  }

  return res.json({ success: true })
}
