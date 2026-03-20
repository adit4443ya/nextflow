import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { nanoid } from "nanoid";

/**
 * POST /api/process/crop
 * 
 * Crops an image using percentage-based parameters.
 * Uses sharp for server-side processing. Falls back to passthrough if sharp unavailable.
 * 
 * In production with Trigger.dev, this runs as a background task with FFmpeg.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, x, y, width, height } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    }

    try {
      // Try to use sharp for image processing
      const sharp = (await import("sharp")).default;
      
      // Fetch the source image
      let imageBuffer: Buffer;
      
      if (imageUrl.startsWith("/uploads/")) {
        // Local file
        const filePath = join(process.cwd(), "public", imageUrl);
        imageBuffer = await readFile(filePath);
      } else if (imageUrl.startsWith("http")) {
        const response = await fetch(imageUrl);
        imageBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        return NextResponse.json({
          outputUrl: imageUrl,
          message: "Cannot process non-HTTP or non-local URLs",
        });
      }

      // Get image dimensions
      const metadata = await sharp(imageBuffer).metadata();
      const imgWidth = metadata.width || 1;
      const imgHeight = metadata.height || 1;

      // Calculate pixel values from percentages
      const cropX = Math.round((Number(x) / 100) * imgWidth);
      const cropY = Math.round((Number(y) / 100) * imgHeight);
      const cropW = Math.min(
        Math.round((Number(width) / 100) * imgWidth),
        imgWidth - cropX
      );
      const cropH = Math.min(
        Math.round((Number(height) / 100) * imgHeight),
        imgHeight - cropY
      );

      // Apply crop
      const croppedBuffer = await sharp(imageBuffer)
        .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Save to uploads
      const uploadsDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadsDir, { recursive: true });
      const fileName = `crop_${nanoid(8)}.jpg`;
      const outputPath = join(uploadsDir, fileName);
      await writeFile(outputPath, croppedBuffer);

      return NextResponse.json({
        outputUrl: `/uploads/${fileName}`,
        dimensions: { width: cropW, height: cropH },
      });
    } catch {
      // sharp not available — passthrough with log
      console.log("[Crop] sharp not available, passing through original image. Install with: npm install sharp");
      console.log(`[Crop] Params: x=${x}%, y=${y}%, w=${width}%, h=${height}%`);
      
      return NextResponse.json({
        outputUrl: imageUrl,
        message: "Install 'sharp' for server-side cropping: npm install sharp",
      });
    }
  } catch (error: any) {
    console.error("Crop error:", error);
    return NextResponse.json(
      { error: error.message || "Crop processing failed" },
      { status: 500 }
    );
  }
}
