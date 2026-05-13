import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import fs from "fs";
import path from "path";
import os from "os";

// Store mode files in temp directory to avoid file watcher triggering restarts
const CHECKOUT_MODE_FILE = path.join(os.tmpdir(), "4got10-checkout-mode.json");
const STRIPE_MODE_FILE = path.join(os.tmpdir(), "4got10-stripe-mode.json");

// Ensure checkout mode file exists
if (!fs.existsSync(CHECKOUT_MODE_FILE)) {
  fs.writeFileSync(CHECKOUT_MODE_FILE, JSON.stringify({ mode: "standard" }));
}
if (!fs.existsSync(STRIPE_MODE_FILE)) {
  fs.writeFileSync(STRIPE_MODE_FILE, JSON.stringify({ mode: "test" }));
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const data = fs.readFileSync(CHECKOUT_MODE_FILE, "utf-8");
    const checkoutMode = JSON.parse(data);
    let stripeMode = "test";
    try {
      const sraw = fs.readFileSync(STRIPE_MODE_FILE, "utf-8");
      const sm = JSON.parse(sraw);
      if (sm?.mode === "live") stripeMode = "live";
    } catch {}

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.json({
      mode: checkoutMode.mode || "standard",
      stripe_mode: stripeMode,
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({ mode: "standard" });
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

    if (mode) {
      if (!["standard", "embedded"].includes(mode)) {
        return res.status(400).json({ error: "Invalid checkout mode" });
      }
      fs.writeFileSync(CHECKOUT_MODE_FILE, JSON.stringify({ mode }));
    }
    if (stripe_mode) {
      if (!["test", "live"].includes(stripe_mode)) {
        return res.status(400).json({ error: "Invalid stripe_mode" });
      }
      fs.writeFileSync(STRIPE_MODE_FILE, JSON.stringify({ mode: stripe_mode }));
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update checkout mode" });
  }
}
