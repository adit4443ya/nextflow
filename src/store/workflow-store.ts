import { create } from "zustand";
import {
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import {
  NODE_META,
  type NodeTypeKey,
  type WorkflowNode,
  type WorkflowNodeData,
} from "@/types/nodes";
import { isValidConnection } from "@/lib/type-validation";

// ============================================================
// Undo/Redo — two-stack model (undoStack / redoStack)
// ============================================================
interface HistoryEntry {
  nodes: WorkflowNode[];
  edges: Edge[];
}

// ============================================================
// Store state shape
// ============================================================
export interface Viewport { x: number; y: number; zoom: number; }

interface WorkflowState {
  // Current workflow metadata
  workflowId: string | null;
  workflowName: string;

  // React Flow state
  nodes: WorkflowNode[];
  edges: Edge[];
  viewport: Viewport;

  // Undo/Redo
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // Selected nodes (for selective execution)
  selectedNodeIds: Set<string>;

  // Actions
  onNodesChange: OnNodesChange<WorkflowNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  addNode: (type: NodeTypeKey, position?: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  deleteSelectedNodes: () => void;

  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: Edge[]) => void;

  setWorkflow: (id: string, name: string, nodes: WorkflowNode[], edges: Edge[], viewport?: Viewport) => void;
  setWorkflowName: (name: string) => void;
  setViewport: (viewport: Viewport) => void;

  // Selection
  setSelectedNodes: (ids: Set<string>) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Serialization
  toJSON: () => { nodes: WorkflowNode[]; edges: Edge[]; viewport: Viewport };
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: null,
  workflowName: "Untitled Workflow",
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 0.8 },
  undoStack: [],
  redoStack: [],
  selectedNodeIds: new Set(),

  // ---- React Flow callbacks ----

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection: Connection) => {
    // Validate type safety before allowing connection
    if (!isValidConnection(connection, get().nodes)) return;

    // The 'images' handle accepts multiple connections (aggregated)
    // All other handles accept only one connection
    const isMultiHandle = connection.targetHandle === "images";

    let filteredEdges = get().edges;
    if (!isMultiHandle) {
      // Remove any existing connection to this target handle
      filteredEdges = filteredEdges.filter(
        (e) =>
          !(
            e.target === connection.target &&
            e.targetHandle === connection.targetHandle
          )
      );
    }

    get().pushHistory();
    set({
      edges: addEdge(
        {
          ...connection,
          type: "animatedEdge",
          animated: true,
        },
        filteredEdges
      ),
    });
  },

  // ---- Node operations ----

  addNode: (type, position) => {
    const meta = NODE_META[type];
    if (!meta) return;

    get().pushHistory();

    const newNode: WorkflowNode = {
      id: `node_${nanoid(8)}`,
      type,
      position: position ?? {
        x: 250 + Math.random() * 200,
        y: 150 + Math.random() * 200,
      },
      data: { ...meta.defaultData },
    };

    set({ nodes: [...get().nodes, newNode] });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    });
  },

  deleteNode: (nodeId) => {
    get().pushHistory();
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
    });
  },

  deleteSelectedNodes: () => {
    const selected = get().selectedNodeIds;
    if (selected.size === 0) return;
    get().pushHistory();
    set({
      nodes: get().nodes.filter((n) => !selected.has(n.id)),
      edges: get().edges.filter(
        (e) => !selected.has(e.source) && !selected.has(e.target)
      ),
      selectedNodeIds: new Set(),
    });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  setWorkflow: (id, name, nodes, edges, viewport) =>
    set({
      workflowId: id,
      workflowName: name,
      nodes,
      edges,
      ...(viewport ? { viewport } : {}),
      undoStack: [],
      redoStack: [],
    }),

  setWorkflowName: (name) => set({ workflowName: name }),

  setViewport: (viewport) => set({ viewport }),

  // ---- Selection ----

  setSelectedNodes: (ids) => set({ selectedNodeIds: ids }),

  // ---- Undo/Redo ----

  pushHistory: () => {
    const { nodes, edges, undoStack } = get();
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    const newStack = [...undoStack, snapshot];
    // Keep max 50 entries
    if (newStack.length > 50) newStack.shift();
    set({ undoStack: newStack, redoStack: [] });
  },

  undo: () => {
    const { undoStack, redoStack, nodes, edges } = get();
    if (undoStack.length === 0) return;
    const entry = undoStack[undoStack.length - 1];
    const current = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({
      nodes: entry.nodes,
      edges: entry.edges,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current],
    });
  },

  redo: () => {
    const { undoStack, redoStack, nodes, edges } = get();
    if (redoStack.length === 0) return;
    const entry = redoStack[redoStack.length - 1];
    const current = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({
      nodes: entry.nodes,
      edges: entry.edges,
      undoStack: [...undoStack, current],
      redoStack: redoStack.slice(0, -1),
    });
  },

  // ---- Serialization ----

  toJSON: () => {
    const { nodes, edges, viewport } = get();
    return { nodes, edges, viewport };
  },
}));
