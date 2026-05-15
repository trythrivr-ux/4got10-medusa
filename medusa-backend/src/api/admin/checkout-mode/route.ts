import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getSettings, updateSettings } from "../../../lib/site-settings";

// stripe_mode is intentionally read from process.env, NOT from the DB.
// The Stripe payment provider is loaded once at boot from STRIPE_MODE, so
// the DB value would silently desync from the running module. Surfacing the
// env value here keeps the admin UI honest about what is actually live.
const getStripeMode = (): "test" | "live" =>
  process.env.STRIPE_MODE === "live" ? "live" : "test";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const settings = await getSettings(req.scope);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json({
      mode: settings.checkout_mode || "standard",
      stripe_mode: getStripeMode(),
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({ mode: "standard", stripe_mode: getStripeMode() });
  }
}

export async function POST(
  req: MedusaRequest & {
    body: { mode?: string; stripe_mode?: "test" | "live" };
  },
  res: MedusaResponse,
) {
  try {
    const { mode, stripe_mode } = req.body;

    if (stripe_mode !== undefined) {
      return res.status(400).json({
        error:
          "stripe_mode is deploy-time only. Set STRIPE_MODE on Railway and redeploy.",
      });
    }

    const patch: Record<string, any> = {};

    if (mode) {
      if (!["standard", "embedded"].includes(mode)) {
        return res.status(400).json({ error: "Invalid checkout mode" });
      }
      patch.checkout_mode = mode;
    }

    if (Object.keys(patch).length) {
      await updateSettings(req.scope, patch);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update checkout mode" });
  }
}
