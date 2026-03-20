import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { executeWorkflow } from "@/lib/execution-engine";

// POST /api/workflows/[id]/execute — run the workflow
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const selectedNodeIds: string[] | undefined = body.selectedNodeIds;

    const result = await executeWorkflow(id, userId, selectedNodeIds);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Execution error:", error);
    return NextResponse.json(
      { error: error.message || "Workflow execution failed" },
      { status: 500 }
    );
  }
}
