"use client";

import React, { useCallback } from "react";
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  Controls,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkflowStore } from "@/store/workflow-store";
import { isValidConnection } from "@/lib/type-validation";

// Node components
import TextNode from "@/components/nodes/TextNode";
import UploadImageNode from "@/components/nodes/UploadImageNode";
import UploadVideoNode from "@/components/nodes/UploadVideoNode";
import LLMNode from "@/components/nodes/LLMNode";
import CropImageNode from "@/components/nodes/CropImageNode";
import ExtractFrameNode from "@/components/nodes/ExtractFrameNode";

// Edge components
import AnimatedEdge from "@/components/edges/AnimatedEdge";

// Register custom node types — must be stable references (outside component or useMemo)
const nodeTypes = {
  textNode: TextNode,
  uploadImageNode: UploadImageNode,
  uploadVideoNode: UploadVideoNode,
  llmNode: LLMNode,
  cropImageNode: CropImageNode,
  extractFrameNode: ExtractFrameNode,
};

const edgeTypes = {
  animatedEdge: AnimatedEdge,
};

const defaultEdgeOptions = {
  type: "animatedEdge",
  animated: true,
};

export default function WorkflowCanvas() {
  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodes,
    setViewport,
    deleteSelectedNodes,
    undo,
    redo,
  } = useWorkflowStore();

  // Connection validation
  const handleIsValidConnection = useCallback(
    (connection: any) => isValidConnection(connection, nodes),
    [nodes]
  );

  // Track selection for "Run Selected" feature
  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      setSelectedNodes(new Set(params.nodes.map((n) => n.id)));
    },
    [setSelectedNodes]
  );

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelectedNodes();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      }
    },
    [deleteSelectedNodes, undo, redo]
  );

  return (
    <div className="flex-1 h-full" onKeyDown={handleKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        isValidConnection={handleIsValidConnection}
        onSelectionChange={handleSelectionChange}
        onMoveEnd={(_, vp) => setViewport(vp)}
        defaultViewport={viewport}
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={null}
        className="bg-[#0a0a0b]"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1a1a1e"
        />
        <Controls
          className="!bg-[#141416] !border-[#2a2a2e] !rounded-lg !shadow-lg
            [&>button]:!bg-[#141416] [&>button]:!border-[#2a2a2e] [&>button]:!text-[#71717a]
            [&>button:hover]:!bg-[#1a1a1e] [&>button:hover]:!text-[#e4e4e7]"
        />
        <MiniMap
          className="!bg-[#141416] !border-[#2a2a2e] !rounded-lg"
          nodeColor="#2a2a2e"
          maskColor="rgba(0, 0, 0, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
