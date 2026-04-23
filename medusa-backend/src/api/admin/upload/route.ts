import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(
  req: MedusaRequest & { files: any },
  res: MedusaResponse,
) {
  const fileService: any = req.scope.resolve("fileService");

  try {
    const file = req.files.file;

    const result = await fileService.create({
      filename: file.name,
      mimeType: file.mimetype,
      content: file.data,
      folder: "rollouts",
    });

    res.json({
      file: result,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
}
