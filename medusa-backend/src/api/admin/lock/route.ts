import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import fs from "fs";
import path from "path";
import os from "os";

// Store lock file in temp directory to avoid file watcher triggering restarts
const LOCK_FILE = path.join(os.tmpdir(), "4got10-website-lock.json");

// Ensure lock file exists
if (!fs.existsSync(LOCK_FILE)) {
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ locked: false }));
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const data = fs.readFileSync(LOCK_FILE, "utf-8");
    const lockState = JSON.parse(data);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.json({ locked: lockState.locked || false });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json({ locked: false });
  }
}

export async function POST(
  req: MedusaRequest & { body: { locked: boolean } },
  res: MedusaResponse,
) {
  try {
    const { locked } = req.body;
    fs.writeFileSync(LOCK_FILE, JSON.stringify({ locked }));
    res.json({ locked });
  } catch (error) {
    res.status(500).json({ error: "Failed to update lock state" });
  }
}
