---
trigger: always_on
---

# Email Service Rules (Resend)

## Core Setup

- This project uses Resend for transactional emails.
- The email module is registered in `medusa-backend/src/modules/email/`.
- Order confirmation emails are sent via an API route called after successful order completion.

## Environment Variables

Required environment variables in the Medusa backend:

- `RESEND_API_KEY`: Your Resend API key (starts with `re_`)
- `RESEND_FROM_EMAIL`: The sender email address (must be verified in Resend)

## Email Module

The email module provides a service with the following method:

### `sendOrderConfirmation(data)`

Sends an order confirmation email to the customer.

**Parameters:**

- `to`: Customer email address
- `orderId`: Order ID
- `customerName`: Customer's name
- `items`: Array of order items with title, quantity, and unit_price
- `total`: Order total in cents
- `currency`: Currency code (e.g., "USD", "DKK")

**Email Template:**

- Subject: "Order Confirmed #{orderId}"
- Includes order details, item list, and total
- Styled HTML template with 4got10 branding

## API Route

The order confirmation email is sent via:

- `src/api/store/send-order-confirmation/route.ts`
- POST endpoint at `/store/send-order-confirmation`
- Accepts `{ order_id }` in the request body
- Fetches order details and calls the email service
- Returns `{ success: true }` on success

## Setup Instructions

1. **Get a Resend API Key:**
   - Sign up at https://resend.com
   - Create an API key in the dashboard
   - Verify your sender domain/email

2. **Configure Environment Variables:**

   ```bash
   # In medusa-backend/.env
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

3. **Restart the Medusa Backend:**
   - The email module will be loaded automatically
   - The API route will be available

## Testing

To test the email service:

1. Make a POST request to `/store/send-order-confirmation` with `{ "order_id": "order_xxx" }`
2. Check the Resend dashboard for sent emails
3. Verify the email content includes order details

## Error Handling

- If `RESEND_API_KEY` is not set, the service logs a warning and does nothing
- Email sending errors are caught and logged but don't fail the API request
- Check backend logs for email-related errors

## Deployment Notes

- Railway: Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` as environment variables
- Vercel: No changes needed (email is sent from backend)
- Ensure the sender email is verified in Resend before production use
