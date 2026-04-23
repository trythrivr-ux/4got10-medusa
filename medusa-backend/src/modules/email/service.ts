import { Resend } from "resend"

export default class EmailModuleService {
  private resend: Resend

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set. Email service will not work.")
    }
    this.resend = new Resend(apiKey || "")
  }

  async sendOrderConfirmation(data: {
    to: string
    orderId: string
    customerName: string
    items: Array<{
      title: string
      quantity: number
      unit_price: number
    }>
    total: number
    currency: string
  }) {
    if (!process.env.RESEND_API_KEY) {
      console.warn("Cannot send email: RESEND_API_KEY not set")
      return
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com"

    const itemsList = data.items
      .map(
        (item) =>
          `<li>${item.title} x ${item.quantity} - ${new Intl.NumberFormat(
            "en-US",
            { style: "currency", currency: data.currency }
          ).format(item.unit_price / 100)}</li>`
      )
      .join("")

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #484848; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .order-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed</h1>
          </div>
          <div class="content">
            <p>Hi ${data.customerName},</p>
            <p>Thank you for your order! Your order <strong>#${data.orderId}</strong> has been confirmed.</p>
            
            <div class="order-details">
              <h2>Order Details</h2>
              <ul>${itemsList}</ul>
              <div class="total">
                Total: ${new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: data.currency,
                }).format(data.total / 100)}
              </div>
            </div>
            
            <p>We'll send you another email when your order ships.</p>
          </div>
          <div class="footer">
            <p>© 2026 4got10. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `

    try {
      await this.resend.emails.send({
        from: fromEmail,
        to: data.to,
        subject: `Order Confirmed #${data.orderId}`,
        html,
      })
      console.log(`Order confirmation email sent to ${data.to}`)
    } catch (error) {
      console.error("Failed to send order confirmation email:", error)
      throw error
    }
  }
}
