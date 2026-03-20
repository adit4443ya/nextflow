import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET /api/runs/[runId] — get run details with all node runs
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { runId } = await params;

    const run = await prisma.workflowRun.findFirst({
      where: { id: runId, userId },
      include: {
        nodeRuns: {
          orderBy: { startedAt: "asc" },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error("GET /api/runs/[runId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
