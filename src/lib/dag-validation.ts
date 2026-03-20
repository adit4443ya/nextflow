import type { Edge } from "@xyflow/react";
import type { WorkflowNode } from "@/types/nodes";
import { NODE_INPUTS, type NodeTypeKey } from "@/types/nodes";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: "cycle" | "missing_required_input" | "no_nodes";
  message: string;
  nodeIds?: string[];
}

export interface ValidationWarning {
  type: "disconnected_node" | "empty_text";
  message: string;
  nodeId?: string;
}

/**
 * Validates a workflow DAG before execution.
 * Checks for cycles, missing required inputs, and disconnected nodes.
 */
export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: Edge[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (nodes.length === 0) {
    errors.push({
      type: "no_nodes",
      message: "Workflow has no nodes. Add at least one node to run.",
    });
    return { valid: false, errors, warnings };
  }

  // ---- Cycle detection using DFS ----
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }
  for (const edge of edges) {
    if (adj.has(edge.source)) {
      adj.get(edge.source)!.push(edge.target);
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycleNodes: string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    inStack.add(nodeId);

    for (const neighbor of adj.get(nodeId) || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (inStack.has(neighbor)) {
        cycleNodes.push(neighbor);
        return true;
      }
    }

    inStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        errors.push({
          type: "cycle",
          message:
            "Workflow contains a circular dependency. Remove the cycle to run.",
          nodeIds: cycleNodes,
        });
        break;
      }
    }
  }

  // ---- Missing required inputs ----
  const connectedInputs = new Map<string, Set<string>>();
  for (const node of nodes) {
    connectedInputs.set(node.id, new Set());
  }
  for (const edge of edges) {
    if (edge.targetHandle && connectedInputs.has(edge.target)) {
      connectedInputs.get(edge.target)!.add(edge.targetHandle);
    }
  }

  for (const node of nodes) {
    const nodeType = node.type as NodeTypeKey;
    const inputs = NODE_INPUTS[nodeType] || [];
    const connected = connectedInputs.get(node.id) || new Set();
    const nodeData = node.data as any;

    for (const input of inputs) {
      if (input.required && !connected.has(input.id)) {
        // Check if there's manual data for this input
        const hasManualData = (() => {
          if (nodeType === "llmNode" && input.id === "user_message") {
            return !!nodeData.userMessage;
          }
          if (nodeType === "cropImageNode" && input.id === "image_url") {
            return !!nodeData.imageUrl;
          }
          if (nodeType === "extractFrameNode" && input.id === "video_url") {
            return !!nodeData.videoUrl;
          }
          return false;
        })();

        if (!hasManualData) {
          errors.push({
            type: "missing_required_input",
            message: `"${nodeData.label || nodeType}" is missing required input: ${input.label}`,
            nodeIds: [node.id],
          });
        }
      }
    }
  }

  // ---- Warnings: disconnected nodes ----
  const hasIncoming = new Set(edges.map((e) => e.target));
  const hasOutgoing = new Set(edges.map((e) => e.source));

  for (const node of nodes) {
    if (
      !hasIncoming.has(node.id) &&
      !hasOutgoing.has(node.id) &&
      nodes.length > 1
    ) {
      warnings.push({
        type: "disconnected_node",
        message: `"${(node.data as any).label || node.type}" is not connected to any other node.`,
        nodeId: node.id,
      });
    }
  }

  // ---- Warnings: empty text nodes ----
  for (const node of nodes) {
    if (node.type === "textNode") {
      const text = (node.data as any).text;
      if (!text || text.trim() === "") {
        warnings.push({
          type: "empty_text",
          message: `Text node "${(node.data as any).label}" is empty.`,
          nodeId: node.id,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
