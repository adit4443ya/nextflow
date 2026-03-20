"use client";

import React, { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Clapperboard, Loader2 } from "lucide-react";
import NodeWrapper from "./NodeWrapper";
import { NODE_TYPES, type ExtractFrameNodeData } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflow-store";

export default function ExtractFrameNode({ id, data }: NodeProps) {
  const nodeData = data as ExtractFrameNodeData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const edges = useWorkflowStore((s) => s.edges);

  const connectedInputs = new Set(
    edges
      .filter((e) => e.target === id && e.targetHandle)
      .map((e) => e.targetHandle!)
  );

  const onTimestampChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { timestamp: e.target.value });
    },
    [id, updateNodeData]
  );

  return (
    <NodeWrapper
      id={id}
      type={NODE_TYPES.EXTRACT_FRAME}
      label="Extract Frame"
      icon={<Clapperboard size={14} />}
      color="#3b82f6"
      isRunning={nodeData.isRunning}
      error={nodeData.error}
    >
      {/* Video input indicator */}
      <div className="text-[10px] text-[#71717a] flex items-center gap-1">
        Video Input
        {connectedInputs.has("video_url") ? (
          <span className="text-blue-400">● connected</span>
        ) : (
          <span className="text-red-400">● required</span>
        )}
      </div>

      {/* Timestamp */}
      <div>
        <label className="text-[10px] text-[#71717a] uppercase tracking-wider flex items-center gap-1">
          Timestamp
          {connectedInputs.has("timestamp") && (
            <span className="text-blue-400">● connected</span>
          )}
        </label>
        <input
          type="text"
          value={nodeData.timestamp || "0"}
          onChange={onTimestampChange}
          onKeyDown={(e) => e.stopPropagation()}
          disabled={connectedInputs.has("timestamp")}
          placeholder='e.g. 5 (seconds) or "50%" '
          className="nodrag w-full bg-[#0f0f11] border border-[#2a2a2e] rounded-lg px-3 py-1.5
            text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none
            focus:border-blue-500/50 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      {nodeData.isRunning && (
        <div className="flex items-center gap-2 text-xs text-blue-400">
          <Loader2 size={12} className="animate-spin" />
          Extracting frame...
        </div>
      )}

      {/* Output preview */}
      {nodeData.output && !nodeData.isRunning && (
        <div className="mt-1 border-t border-[#2a2a2e] pt-2">
          <label className="text-[10px] text-[#71717a] uppercase tracking-wider">
            Extracted Frame
          </label>
          <img
            src={nodeData.output}
            alt="Extracted frame"
            className="w-full h-24 object-cover rounded-lg border border-[#2a2a2e] mt-1"
          />
        </div>
      )}
    </NodeWrapper>
  );
}
