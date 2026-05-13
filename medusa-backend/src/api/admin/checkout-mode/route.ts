import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getSettings, updateSettings } from "../../../lib/site-settings";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const settings = await getSettings(req.scope);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json({
      mode: settings.checkout_mode || "standard",
      stripe_mode: settings.stripe_mode || "test",
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({ mode: "standard", stripe_mode: "test" });
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
    const patch: Record<string, any> = {};

    if (mode) {
      if (!["standard", "embedded"].includes(mode)) {
        return res.status(400).json({ error: "Invalid checkout mode" });
      }
      patch.checkout_mode = mode;
    }
    if (stripe_mode) {
      if (!["test", "live"].includes(stripe_mode)) {
        return res.status(400).json({ error: "Invalid stripe_mode" });
      }
      patch.stripe_mode = stripe_mode;
    }

    if (Object.keys(patch).length) {
      await updateSettings(req.scope, patch);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update checkout mode" });
  }
}
