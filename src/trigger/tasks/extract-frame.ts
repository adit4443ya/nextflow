import { task } from "@trigger.dev/sdk/v3";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

export const extractFrameTask = task({
  id: "extract-frame",
  maxDuration: 60,
  retry: { maxAttempts: 2 },
  run: async (payload: {
    videoUrl: string;  // HTTP URL or file:// path
    timestamp: string; // seconds or "50%"
  }) => {
    const { videoUrl, timestamp } = payload;

    const tmpDir = join("/tmp", `nf_frame_${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    const outputPath = join(tmpDir, "frame.jpg");

    // Resolve ffmpeg/ffprobe — check common binary locations
    const findBin = (name: string): string => {
      for (const c of [`/usr/bin/${name}`, `/usr/local/bin/${name}`, `/opt/homebrew/bin/${name}`, name]) {
        try { execSync(`"${c}" -version`, { stdio: "pipe" }); return c; } catch {}
      }
      return name;
    };
    const ffmpegBin = findBin("ffmpeg");
    const ffprobeBin = findBin("ffprobe");

    // Resolve input — local file:// path uses the path directly;
    // HTTPS URLs are handled inline: try passing directly to ffmpeg first
    // (ffmpeg has native HTTP client support), only download as fallback
    let inputArg: string;

    if (videoUrl.startsWith("file://")) {
      inputArg = videoUrl.replace("file://", "");
    } else {
      // HTTPS (Vercel Blob) — download to disk first for reliability
      const inputPath = join(tmpDir, "input.mp4");
      try {
        const response = await fetch(videoUrl, {
          headers: { "User-Agent": "NextFlow/1.0" },
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        writeFileSync(inputPath, buffer);
        inputArg = inputPath;
      } catch (fetchErr: any) {
        // fallback: let ffmpeg fetch the URL directly (it has its own HTTP client)
        inputArg = videoUrl;
      }
    }

    // Parse timestamp — support "N%" (percentage) or plain seconds
    let seekTime = "0";
    const ts = String(timestamp).trim();

    if (ts.includes("%")) {
      try {
        const probe = execSync(
          `"${ffprobeBin}" -v quiet -show_entries format=duration -of csv=p=0 "${inputArg}"`,
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

    // Extract frame
    execSync(
      `"${ffmpegBin}" -ss ${seekTime} -i "${inputArg}" -frames:v 1 -q:v 2 -y "${outputPath}"`,
      { stdio: ["pipe", "pipe", "pipe"] }
    );

    if (!existsSync(outputPath)) {
      throw new Error("Frame extraction produced no output");
    }

    const frameBuffer = readFileSync(outputPath);
    return {
      output: `data:image/jpeg;base64,${frameBuffer.toString("base64")}`,
    };
  },
});
