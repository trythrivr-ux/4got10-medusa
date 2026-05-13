import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getSettings } from "../../../lib/site-settings";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const settings = await getSettings(req.scope);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json({ locked: settings.locked ?? false });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({ locked: false });
  }
}
