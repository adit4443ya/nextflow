import { prisma } from "@/lib/db";
import { runGroq } from "@/lib/groq";
import { runOpenRouter } from "@/lib/openrouter";
import { resolveImageUrls } from "@/lib/resolve-url";
import {
  isTriggerConfigured,
  triggerLLM,
  triggerCropImage,
  triggerExtractFrame,
} from "@/trigger/client";
import type { WorkflowNode } from "@/types/nodes";
import type { Edge } from "@xyflow/react";

// ============================================================
// Execution Plan — phases of nodes that can run in parallel
// ============================================================
export interface ExecutionPhase {
  nodeIds: string[];
}

export interface ExecutionPlan {
  phases: ExecutionPhase[];
  nodeMap: Map<string, WorkflowNode>;
}

/**
 * Kahn's topological sort with BFS-level grouping.
 * Each BFS level = one phase where all nodes execute in parallel.
 */
export function buildExecutionPlan(
  nodes: WorkflowNode[],
  edges: Edge[]
): ExecutionPlan {
  const nodeMap = new Map<string, WorkflowNode>();
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    if (adj.has(edge.source) && inDegree.has(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  const phases: ExecutionPhase[] = [];
  let queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  let totalScheduled = 0;

  while (queue.length > 0) {
    phases.push({ nodeIds: [...queue] });
    totalScheduled += queue.length;

    const nextQueue: string[] = [];
    for (const nodeId of queue) {
      for (const downstream of adj.get(nodeId) ?? []) {
        const newDeg = (inDegree.get(downstream) ?? 1) - 1;
        inDegree.set(downstream, newDeg);
        if (newDeg === 0) nextQueue.push(downstream);
      }
    }
    queue = nextQueue;
  }

  if (totalScheduled !== nodes.length) {
    throw new Error("Workflow contains a cycle. Remove circular connections and try again.");
  }

  return { phases, nodeMap };
}

/**
 * Collects input values from upstream connected nodes.
 */
function collectInputs(
  nodeId: string,
  edges: Edge[],
  outputs: Map<string, any>
): Record<string, any> {
  const inputs: Record<string, any> = {};

  for (const edge of edges) {
    if (edge.target === nodeId && edge.targetHandle && edge.source) {
      const sourceOutput = outputs.get(edge.source);
      if (sourceOutput !== undefined) {
        const handleId = edge.targetHandle;
        if (handleId === "images") {
          if (!inputs[handleId]) inputs[handleId] = [];
          inputs[handleId].push(sourceOutput);
        } else {
          inputs[handleId] = sourceOutput;
        }
      }
    }
  }

  return inputs;
}

// ============================================================
// Node execution — routes through Trigger.dev or falls back to direct
// ============================================================

const useTrigger = isTriggerConfigured();

async function executeSingleNode(
  node: WorkflowNode,
  inputs: Record<string, any>,
  apiKeys: { groq: string; openrouter: string }
): Promise<any> {
  const nodeType = node.type;
  const data = node.data as any;

  switch (nodeType) {
    // ---- Simple data nodes — always resolve directly ----
    case "textNode":
      return data.text || "";

    case "uploadImageNode": {
      const url = data.imageUrl || data.output || null;
      if (url?.startsWith("blob:")) throw new Error("Image upload not complete. Wait for the upload to finish before running.");
      return url;
    }

    case "uploadVideoNode": {
      const url = data.videoUrl || data.output || null;
      if (url?.startsWith("blob:")) throw new Error("Video upload not complete. Wait for the upload to finish before running.");
      return url;
    }

    // ---- LLM Node — Trigger.dev task or direct ----
    case "llmNode": {
      const systemPrompt = inputs.system_prompt ?? data.systemPrompt ?? "";
      const userMessage = inputs.user_message ?? data.userMessage ?? "";
      const rawImageUrls: string[] = inputs.images ?? data.imageUrls ?? [];
      const model = data.model || "groq:meta-llama/llama-4-scout-17b-16e-instruct";
      const temperature = data.temperature ?? 0.7;
      const maxTokens = data.maxTokens ?? 1024;

      if (!userMessage) throw new Error("LLM Node requires a user message input.");

      // Determine provider
      let provider: "groq" | "openrouter" = "groq";
      let actualModel = model;

      if (model.startsWith("groq:")) {
        provider = "groq";
        actualModel = model.replace("groq:", "");
      } else if (model.startsWith("or:")) {
        provider = "openrouter";
        actualModel = model.replace("or:", "");
      } else {
        provider = "groq";
      }

      const apiKey = provider === "openrouter" ? apiKeys.openrouter : apiKeys.groq;

      // Resolve image URLs to data URIs
      const resolvedImages = await resolveImageUrls(
        Array.isArray(rawImageUrls) ? rawImageUrls : [rawImageUrls]
      );

      if (useTrigger) {
        const result = await triggerLLM({
          provider,
          model: actualModel,
          systemPrompt,
          userMessage,
          imageUrls: resolvedImages,
          apiKey,
          temperature,
          maxTokens,
        });
        return result.output;
      }

      // Direct execution fallback
      const runFn = provider === "groq" ? runGroq : runOpenRouter;
      return await runFn({
        model: actualModel,
        systemPrompt,
        userMessage,
        imageUrls: resolvedImages,
        apiKey,
      });
    }

    // ---- Crop Image — Trigger.dev task or direct API ----
    case "cropImageNode": {
      const imageUrl = inputs.image_url ?? data.imageUrl;
      if (!imageUrl) throw new Error("Crop Image Node requires an image input.");

      const xPercent = Number(inputs.x_percent ?? data.xPercent ?? 0);
      const yPercent = Number(inputs.y_percent ?? data.yPercent ?? 0);
      const widthPercent = Number(inputs.width_percent ?? data.widthPercent ?? 100);
      const heightPercent = Number(inputs.height_percent ?? data.heightPercent ?? 100);

      if (useTrigger) {
        // For local /uploads/ paths, convert to file:// so the worker can read from disk
        let resolvedImageUrl = imageUrl;
        if (imageUrl.startsWith("/uploads/")) {
          const { join } = await import("path");
          resolvedImageUrl = `file://${join(process.cwd(), "public", imageUrl)}`;
        }
        // HTTPS URLs (Vercel Blob) are passed as-is — crop task fetches them internally
        const result = await triggerCropImage({
          imageUrl: resolvedImageUrl,
          xPercent,
          yPercent,
          widthPercent,
          heightPercent,
        });
        return result.output;
      }

      // Direct fallback via API route
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/process/crop`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl, x: xPercent, y: yPercent, width: widthPercent, height: heightPercent }),
        }
      );

      if (!res.ok) throw new Error(`Crop failed: ${await res.text()}`);
      const result = await res.json();
      return result.outputUrl || imageUrl;
    }

    // ---- Extract Frame — Trigger.dev task or direct API ----
    case "extractFrameNode": {
      const videoUrl = inputs.video_url ?? data.videoUrl;
      if (!videoUrl) throw new Error("Extract Frame Node requires a video input.");

      const timestamp = inputs.timestamp ?? data.timestamp ?? "0";

      if (useTrigger) {
        let resolvedVideoUrl = videoUrl;
        if (videoUrl.startsWith("/uploads/")) {
          // Local dev: convert relative path to file:// so Trigger.dev worker reads from disk
          const { join } = await import("path");
          resolvedVideoUrl = `file://${join(process.cwd(), "public", videoUrl)}`;
        }
        // Production Blob URLs (https://) are passed through as-is
        const result = await triggerExtractFrame({ videoUrl: resolvedVideoUrl, timestamp: String(timestamp) });
        return result.output;
      }

      // Direct fallback
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/process/extract-frame`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl, timestamp }),
        }
      );

      if (!res.ok) throw new Error(`Frame extraction failed: ${await res.text()}`);
      const result = await res.json();
      return result.outputUrl || null;
    }

    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
}

// ============================================================
// Main workflow execution orchestrator
// ============================================================
export type RunScope = "FULL" | "PARTIAL" | "SINGLE";

export interface ExecutionResult {
  runId: string;
  status: "SUCCESS" | "FAILED";
  outputs: Record<string, any>;
  errors: Record<string, string>;
}

export async function executeWorkflow(
  workflowId: string,
  userId: string,
  selectedNodeIds?: string[]
): Promise<ExecutionResult> {
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, userId },
  });

  if (!workflow) throw new Error("Workflow not found");

  let nodes: WorkflowNode[] = workflow.nodes as any;
  let edges: Edge[] = workflow.edges as any;
  const allNodes = nodes;

  let scope: RunScope = "FULL";
  // Pre-seeded outputs from non-selected upstream nodes (for "Run Selected" mode)
  const upstreamNodeData = new Map<string, any>();

  if (selectedNodeIds && selectedNodeIds.length > 0) {
    scope = selectedNodeIds.length === 1 ? "SINGLE" : "PARTIAL";
    const idSet = new Set(selectedNodeIds);
    nodes = nodes.filter((n) => idSet.has(n.id));
    // Keep edges INTO selected nodes from ANY source — buildExecutionPlan ignores
    // non-selected sources because adj.has(edge.source) will be false for them,
    // so topological sort is only over the selected subgraph
    edges = edges.filter((e) => idSet.has(e.target));
    // Pre-seed data from non-selected upstream nodes so collectInputs can resolve their outputs
    for (const edge of edges) {
      if (!idSet.has(edge.source) && !upstreamNodeData.has(edge.source)) {
        const upstream = allNodes.find((n) => n.id === edge.source);
        if (upstream) {
          const d = upstream.data as any;
          upstreamNodeData.set(edge.source, d.output ?? d.text ?? d.imageUrl ?? d.videoUrl ?? "");
        }
      }
    }
  }

  const plan = buildExecutionPlan(nodes, edges);

  const run = await prisma.workflowRun.create({
    data: { workflowId, userId, scope, status: "RUNNING" },
  });

  const apiKeys = {
    groq: process.env.GROQ_API_KEY || "",
    openrouter: process.env.OPENROUTER_API_KEY || "",
  };

  // Seeded with existing outputs from non-selected upstream nodes (populated above)
  const outputs = new Map<string, any>(upstreamNodeData);
  const nodeResults: Record<string, any> = {};
  const nodeErrors: Record<string, string> = {};
  let anyFailed = false;

  console.log(`[Execution] Starting workflow ${workflowId}, ${nodes.length} nodes, trigger=${useTrigger}`);

  for (const phase of plan.phases) {
    await Promise.allSettled(
      phase.nodeIds.map(async (nodeId) => {
        const node = plan.nodeMap.get(nodeId)!;
        const nodeData = node.data as any;
        const startTime = Date.now();

        const nodeRun = await prisma.nodeRun.create({
          data: {
            workflowRunId: run.id,
            nodeId,
            nodeType: node.type || "unknown",
            nodeName: nodeData.label || node.type || "Unknown",
            status: "RUNNING",
          },
        });

        try {
          const inputs = collectInputs(nodeId, edges, outputs);
          const output = await executeSingleNode(node, inputs, apiKeys);
          outputs.set(nodeId, output);
          nodeResults[nodeId] = output;

          await prisma.nodeRun.update({
            where: { id: nodeRun.id },
            data: {
              status: "SUCCESS",
              output: output != null ? JSON.stringify(output).slice(0, 5000) : undefined,
              inputs: JSON.stringify(inputs).slice(0, 5000),
              duration: Date.now() - startTime,
              completedAt: new Date(),
            },
          });
        } catch (error: any) {
          anyFailed = true;
          nodeErrors[nodeId] = error.message || "Unknown error";
          await prisma.nodeRun.update({
            where: { id: nodeRun.id },
            data: {
              status: "FAILED",
              error: error.message || "Unknown error",
              duration: Date.now() - startTime,
              completedAt: new Date(),
            },
          });
        }
      })
    );
  }

  await prisma.workflowRun.update({
    where: { id: run.id },
    data: {
      status: anyFailed ? "FAILED" : "SUCCESS",
      duration: Date.now() - run.startedAt.getTime(),
      completedAt: new Date(),
    },
  });

  return { runId: run.id, status: anyFailed ? "FAILED" : "SUCCESS", outputs: nodeResults, errors: nodeErrors };
}
