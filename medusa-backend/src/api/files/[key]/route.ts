import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const s3Client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true,
});

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const key = (req.params as any).key as string | undefined;

  if (!key) {
    return res.status(400).json({ error: "Missing key" });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);

    const stream = response.Body as any;
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    res.setHeader(
      "Content-Type",
      response.ContentType || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.send(buffer);
  } catch (error: any) {
    console.error("Error serving file from S3:", error);
    res.status(404).json({ error: "File not found" });
  }
}
