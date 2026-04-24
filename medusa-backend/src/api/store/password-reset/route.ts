import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { email } = req.body as { email: string }

  if (!email) {
    return res.status(400).json({ error: "email is required" })
  }

  try {
    // Generate a reset token (in production, use a proper JWT or random token with expiry)
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64')
    
    const emailModule = req.scope.resolve("email")
    
    // Get the storefront URL from environment or use default
    const storefrontUrl = process.env.STOREFRONT_URL || "http://localhost:8000"
    const resetUrl = `${storefrontUrl}/account/reset-password?token=${token}`

    await emailModule.sendPasswordReset({
      to: email,
      token,
      customerName: email.split("@")[0],
      resetUrl,
    })

    res.json({ success: true, message: "Password reset email sent" })
  } catch (error) {
    console.error("Failed to send password reset email:", error)
    // Don't reveal if email exists for security
    res.json({ success: true, message: "If the email exists, a reset link has been sent" })
  }
}
