import { task } from "@trigger.dev/sdk/v3";
import { readFileSync } from "fs";
import sharp from "sharp";

export const cropImageTask = task({
  id: "crop-image",
  maxDuration: 60,
  retry: { maxAttempts: 2 },
  run: async (payload: {
    imageUrl: string; // HTTPS URL, data URI, or file:// path
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  }) => {
    const { imageUrl, xPercent, yPercent, widthPercent, heightPercent } = payload;

    // Resolve image to a buffer — handle all URL formats
    let inputBuffer: Buffer;

    if (imageUrl.startsWith("data:")) {
      // Already a base64 data URI
      const match = imageUrl.match(/^data:[^;]+;base64,(.+)$/);
      if (!match) throw new Error("Invalid data URI for crop image");
      inputBuffer = Buffer.from(match[1], "base64");
    } else if (imageUrl.startsWith("file://")) {
      // Local filesystem path
      inputBuffer = readFileSync(imageUrl.replace("file://", ""));
    } else {
      // HTTPS URL (Vercel Blob etc.) — fetch with timeout
      const response = await fetch(imageUrl, {
        headers: { "User-Agent": "NextFlow/1.0" },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Failed to fetch image: HTTP ${response.status}`);
      inputBuffer = Buffer.from(await response.arrayBuffer());
    }

    // Get dimensions
    const metadata = await sharp(inputBuffer).metadata();
    const imgWidth = metadata.width || 1;
    const imgHeight = metadata.height || 1;

    // Calculate pixel values from percentages
    const cropX = Math.round((xPercent / 100) * imgWidth);
    const cropY = Math.round((yPercent / 100) * imgHeight);
    const cropW = Math.min(Math.round((widthPercent / 100) * imgWidth), imgWidth - cropX);
    const cropH = Math.min(Math.round((heightPercent / 100) * imgHeight), imgHeight - cropY);

    if (cropW <= 0 || cropH <= 0) {
      throw new Error(`Invalid crop dimensions: ${cropW}x${cropH}`);
    }

    const croppedBuffer = await sharp(inputBuffer)
      .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
      .jpeg({ quality: 90 })
      .toBuffer();

    return {
      output: `data:image/jpeg;base64,${croppedBuffer.toString("base64")}`,
      width: cropW,
      height: cropH,
    };
  },
});
