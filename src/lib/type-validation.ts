import { type Connection } from "@xyflow/react";
import {
  NODE_OUTPUTS,
  NODE_INPUTS,
  type NodeTypeKey,
  type WorkflowNode,
} from "@/types/nodes";

/**
 * Validates whether a connection between two handles is type-safe.
 * Image outputs can only connect to image inputs, text to text, etc.
 * Returns false for invalid connections — React Flow will prevent the edge.
 */
export function isValidConnection(
  connection: Connection,
  nodes: WorkflowNode[]
): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);

  if (!sourceNode || !targetNode) return false;
  if (!connection.sourceHandle || !connection.targetHandle) return false;

  // Find output handle definition on source node
  const sourceOutputs = NODE_OUTPUTS[sourceNode.type as NodeTypeKey];
  const sourceHandle = sourceOutputs?.find(
    (h) => h.id === connection.sourceHandle
  );

  // Find input handle definition on target node
  const targetInputs = NODE_INPUTS[targetNode.type as NodeTypeKey];
  const targetHandle = targetInputs?.find(
    (h) => h.id === connection.targetHandle
  );

  if (!sourceHandle || !targetHandle) return false;

  // Type check: output data type must match input data type
  // Special case: TEXT can connect to NUMBER inputs (for manual numeric entry)
  if (sourceHandle.dataType === targetHandle.dataType) return true;
  if (
    sourceHandle.dataType === "text" &&
    targetHandle.dataType === "number"
  )
    return true;

  return false;
}

/**
 * Returns set of input handle IDs that already have a connection.
 * Used to disable/grey-out manual input fields when connected.
 */
export function getConnectedInputs(
  nodeId: string,
  edges: { target: string; targetHandle: string | null | undefined }[]
): Set<string> {
  const connected = new Set<string>();
  for (const edge of edges) {
    if (edge.target === nodeId && edge.targetHandle) {
      connected.add(edge.targetHandle);
    }
  }
  return connected;
}
