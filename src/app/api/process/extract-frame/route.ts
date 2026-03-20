import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { nanoid } from "nanoid";
import { writeFile, mkdir } from "fs/promises";

/**
 * POST /api/process/extract-frame
 * 
 * Extracts a single frame from a video at the specified timestamp.
 * Uses FFmpeg if available, otherwise returns a placeholder.
 * 
 * In production, this runs as a Trigger.dev task.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoUrl, timestamp } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl required" }, { status: 400 });
    }

    // Check if FFmpeg is available
    let ffmpegAvailable = false;
    try {
      execSync("ffmpeg -version", { stdio: "pipe" });
      ffmpegAvailable = true;
    } catch {
      ffmpegAvailable = false;
    }

    if (!ffmpegAvailable) {
      console.log("[ExtractFrame] FFmpeg not available. Install with: sudo apt install ffmpeg");
      return NextResponse.json({
        outputUrl: videoUrl,
        message: "FFmpeg not installed. Install with: sudo apt install ffmpeg",
      });
    }

    // FFmpeg is available — process the video
    const tmpDir = join("/tmp", `nextflow_${nanoid(8)}`);
    mkdirSync(tmpDir, { recursive: true });

    const inputPath = join(tmpDir, "input.mp4");
    const outputPath = join(tmpDir, "frame.jpg");

    // Download or copy video
    if (videoUrl.startsWith("/uploads/")) {
      const srcPath = join(process.cwd(), "public", videoUrl);
      const data = readFileSync(srcPath);
      writeFileSync(inputPath, data);
    } else if (videoUrl.startsWith("http")) {
      const response = await fetch(videoUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      writeFileSync(inputPath, buffer);
    } else {
      return NextResponse.json({
        outputUrl: videoUrl,
        message: "Cannot process this URL type",
      });
    }

    // Parse timestamp
    let seekTime = "0";
    const ts = String(timestamp).trim();

    if (ts.includes("%")) {
      // Get video duration
      try {
        const probe = execSync(
          `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${inputPath}"`,
          { stdio: ["pipe", "pipe", "pipe"] }
        ).toString().trim();
        const duration = parseFloat(probe);
        const percent = parseFloat(ts.replace("%", ""));
        seekTime = ((percent / 100) * duration).toFixed(2);
      } catch {
        seekTime = "0";
      }
    } else {
      seekTime = ts || "0";
    }

    // Extract frame with FFmpeg
    try {
      execSync(
        `ffmpeg -ss ${seekTime} -i "${inputPath}" -frames:v 1 -q:v 2 -y "${outputPath}"`,
        { stdio: ["pipe", "pipe", "pipe"] }
      );
    } catch (ffmpegErr: any) {
      console.error("FFmpeg error:", ffmpegErr.stderr?.toString());
      return NextResponse.json(
        { error: "FFmpeg frame extraction failed" },
        { status: 500 }
      );
    }

    if (!existsSync(outputPath)) {
      return NextResponse.json(
        { error: "Frame extraction produced no output" },
        { status: 500 }
      );
    }

    // Copy to public/uploads
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const fileName = `frame_${nanoid(8)}.jpg`;
    const finalPath = join(uploadsDir, fileName);
    const frameBuffer = readFileSync(outputPath);
    await writeFile(finalPath, frameBuffer);

    return NextResponse.json({
      outputUrl: `/uploads/${fileName}`,
    });
  } catch (error: any) {
    console.error("Extract frame error:", error);
    return NextResponse.json(
      { error: error.message || "Frame extraction failed" },
      { status: 500 }
    );
  }
}
