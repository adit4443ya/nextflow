import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

// GET /api/runs?workflowId=xxx — list runs for a workflow
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflowId = req.nextUrl.searchParams.get("workflowId");
    if (!workflowId) {
      return NextResponse.json({ error: "workflowId required" }, { status: 400 });
    }

    // Verify workflow belongs to user
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const runs = await prisma.workflowRun.findMany({
      where: { workflowId, userId },
      orderBy: { startedAt: "desc" },
      take: 50,
      include: {
        nodeRuns: {
          orderBy: { startedAt: "asc" },
        },
      },
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error("GET /api/runs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
