import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Zod schema for creating/updating a workflow
const workflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional().nullable(),
});

// GET /api/workflows — list all workflows for current user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflows = await prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { runs: true } },
      },
    });

    return NextResponse.json(workflows);
  } catch (error) {
    console.error("GET /api/workflows error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/workflows — create a new workflow
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = workflowSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const workflow = await prisma.workflow.create({
      data: {
        userId,
        name: parsed.data.name ?? "Untitled Workflow",
        description: parsed.data.description ?? null,
        nodes: (parsed.data.nodes as any) ?? [],
        edges: (parsed.data.edges as any) ?? [],
        viewport: parsed.data.viewport as any ?? null,
      },
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    console.error("POST /api/workflows error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
