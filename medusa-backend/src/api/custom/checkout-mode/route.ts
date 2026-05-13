import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import fs from "fs";
import path from "path";
import os from "os";

// Store checkout mode file in temp directory to avoid file watcher triggering restarts
const CHECKOUT_MODE_FILE = path.join(os.tmpdir(), "4got10-checkout-mode.json");

// Ensure checkout mode file exists
if (!fs.existsSync(CHECKOUT_MODE_FILE)) {
  fs.writeFileSync(CHECKOUT_MODE_FILE, JSON.stringify({ mode: "standard" }));
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const data = fs.readFileSync(CHECKOUT_MODE_FILE, "utf-8");
    const checkoutMode = JSON.parse(data);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.json({ mode: checkoutMode.mode || "standard" });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({ mode: "standard" });
  }
}
