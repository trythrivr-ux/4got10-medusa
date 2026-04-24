import { Resend } from "resend";

class EmailModuleService {
  private resend: Resend | null = null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn(
        "RESEND_API_KEY not set. Email service will not send emails.",
      );
      return;
    }
    this.resend = new Resend(apiKey);
  }

  async sendOrderConfirmation(data: {
    to: string;
    orderId: string;
    customerName: string;
    items: Array<{ title: string; quantity: number; unit_price: number }>;
    total: number;
    currency: string;
  }) {
    console.log(
      "sendOrderConfirmation called with to:",
      data.to,
      "orderId:",
      data.orderId,
    );

    if (!this.resend) {
      console.warn(
        "Email service not configured. Skipping order confirmation email.",
      );
      return;
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@4got10.com";

    const itemsHtml = data.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <div style="font-weight: 500; color: #111827;">${item.title}</div>
            <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">
              Qty: ${item.quantity} × ${new Intl.NumberFormat(data.currency, {
                style: "currency",
                currency: data.currency,
              }).format(item.unit_price / 100)}
            </div>
          </td>
        </tr>
      `,
      )
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmed</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #111827;">Order Confirmed</h1>
              <p style="margin: 0 0 32px 0; color: #6b7280;">Thank you for your order, ${data.customerName}!</p>
              
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Order ID</div>
                <div style="font-weight: 600; color: #111827;">#${data.orderId}</div>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                ${itemsHtml}
              </table>
              
              <div style="border-top: 2px solid #111827; padding-top: 20px; display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 18px; font-weight: 600; color: #111827;">Total</div>
                <div style="font-size: 24px; font-weight: 700; color: #111827;">
                  ${new Intl.NumberFormat(data.currency, {
                    style: "currency",
                    currency: data.currency,
                  }).format(data.total / 100)}
                </div>
              </div>
              
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
                <div style="font-weight: 700; color: #111827; margin-bottom: 8px;">4got10</div>
                <div style="font-size: 14px; color: #6b7280;">Questions? Contact us at support@4got10.com</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.resend.emails.send({
        from: fromEmail,
        to: data.to,
        subject: `Order Confirmed #${data.orderId}`,
        html,
      });
    } catch (error) {
      console.error("Failed to send order confirmation email:", error);
      throw error;
    }
  }

  async sendPasswordReset(data: {
    to: string;
    token: string;
    customerName: string;
    resetUrl: string;
  }) {
    if (!this.resend) {
      console.warn(
        "Email service not configured. Skipping password reset email.",
      );
      return;
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@4got10.com";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #111827;">Reset Your Password</h1>
              <p style="margin: 0 0 32px 0; color: #6b7280;">Hi ${data.customerName},</p>
              
              <p style="margin: 0 0 24px 0; color: #374151;">
                We received a request to reset your password. Click the button below to set a new password:
              </p>
              
              <a href="${data.resetUrl}" style="display: inline-block; background: #111827; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 24px;">
                Reset Password
              </a>
              
              <p style="margin: 0 0 32px 0; color: #6b7280; font-size: 14px;">
                This link will expire in 1 hour. If you didn't request a password reset, you can ignore this email.
              </p>
              
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
                <div style="font-weight: 700; color: #111827; margin-bottom: 8px;">4got10</div>
                <div style="font-size: 14px; color: #6b7280;">Questions? Contact us at support@4got10.com</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.resend.emails.send({
        from: fromEmail,
        to: data.to,
        subject: "Reset Your Password",
        html,
      });
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      throw error;
    }
  }
}

export default EmailModuleService;
