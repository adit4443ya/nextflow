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

import { useTheme } from "next-themes";
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
  const { theme } = useTheme();
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
        className="bg-gradient-to-br from-[#F5F3FF] via-[#EEF2FF] to-white dark:bg-none dark:bg-[#0a0a0b]"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={theme === "dark" ? "#1a1a1e" : "#c7d2fe"}
        />
        <Controls
          className="!bg-white/90 !backdrop-blur-2xl !border-indigo-100/50 dark:!bg-[#141416]/90 dark:!border-[#2a2a2e] !rounded-lg !shadow-[0_4px_24px_rgba(79,70,229,0.1)] dark:!shadow-none
            [&>button]:!bg-transparent [&>button]:!border-indigo-50 [&>button]:!text-indigo-600 dark:[&>button]:!border-[#2a2a2e] dark:[&>button]:!text-[#71717a]
            [&>button:hover]:!bg-indigo-50 [&>button:hover]:!text-indigo-900 dark:[&>button:hover]:!bg-[#1a1a1e] dark:[&>button:hover]:!text-[#e4e4e7]"
        />
        <MiniMap
          className="!bg-white/90 !backdrop-blur-2xl !border-indigo-100/50 dark:!bg-[#141416]/90 dark:!border-[#2a2a2e] !rounded-lg !shadow-[0_4px_24px_rgba(79,70,229,0.1)] dark:!shadow-none"
          nodeColor={theme === "dark" ? "#2a2a2e" : "#e0e7ff"}
          maskColor={theme === "dark" ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.6)"}
        />
      </ReactFlow>
    </div>
  );
}
