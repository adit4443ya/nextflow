import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { nanoid } from "nanoid";
import { createTransloaditParams } from "@/lib/transloadit";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mode = req.nextUrl.searchParams.get("mode") || "direct";
    const fileType = req.nextUrl.searchParams.get("type") || "image";

    // Mode 1: Transloadit signed params
    if (mode === "params") {
      const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY;
      const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;

      if (!authKey || !authSecret) {
        return NextResponse.json(
          { error: "Transloadit not configured." },
          { status: 400 }
        );
      }

      const { params, signature } = createTransloaditParams({ authKey, authSecret });
      return NextResponse.json({ params, signature });
    }

    // Mode 2: Direct file upload
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 400 });
    }

    const allowedTypes = fileType === "video" ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop() || (fileType === "video" ? "mp4" : "jpg");
    const fileName = `${nanoid(12)}.${ext}`;
    const bytes = await file.arrayBuffer();

    // Production: use Vercel Blob if token is available
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob");
      const blob = await put(fileName, Buffer.from(bytes), {
        access: "public",
        contentType: file.type,
      });

      return NextResponse.json({
        url: blob.url,
        fileName: file.name,
        size: file.size,
        type: file.type,
      });
    }

    // Local dev: save to /public/uploads/
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(join(uploadsDir, fileName), Buffer.from(bytes));

    return NextResponse.json({
      url: `/uploads/${fileName}`,
      fileName: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
