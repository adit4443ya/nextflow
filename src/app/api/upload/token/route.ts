import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createTransloaditParams } from "@/lib/transloadit";

/**
 * POST /api/upload/token
 * Returns signed Transloadit assembly params for client-side direct uploads.
 * The browser uploads directly to Transloadit CDN — our server never handles the file bytes.
 */
export async function POST(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authKey = process.env.NEXT_PUBLIC_TRANSLOADIT_AUTH_KEY;
  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;

  if (!authKey || !authSecret) {
    return NextResponse.json({ error: "Transloadit not configured" }, { status: 400 });
  }

  const { params, signature } = createTransloaditParams({ authKey, authSecret });
  return NextResponse.json({ params, signature });
}
