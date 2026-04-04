"use client";

import React, { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Type } from "lucide-react";
import NodeWrapper from "./NodeWrapper";
import { NODE_TYPES, type TextNodeData } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflow-store";

export default function TextNode({ id, data }: NodeProps) {
  const nodeData = data as TextNodeData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { text: e.target.value, output: e.target.value });
    },
    [id, updateNodeData]
  );

  return (
    <NodeWrapper
      id={id}
      type={NODE_TYPES.TEXT}
      label="Text"
      icon={<Type size={14} />}
      color="#8b5cf6"
    >
      <textarea
        value={nodeData.text || ""}
        onChange={onChange}
        onKeyDown={(e) => e.stopPropagation()}
        placeholder="Enter text..."
        rows={3}
        className="w-full bg-gray-50 border border-gray-200 dark:bg-[#0f0f11] dark:border-[#2a2a2e] rounded-lg px-3 py-2 text-sm
          text-gray-900 placeholder-gray-400 dark:text-[#e4e4e7] dark:placeholder-[#52525b] resize-none focus:outline-none
          focus:border-purple-500/50 transition-colors nodrag nowheel"
      />
      <div className="flex justify-end">
        <span className="text-[9px] text-gray-400 dark:text-[#3a3a3e]">{(nodeData.text || "").length} chars</span>
      </div>
    </NodeWrapper>
  );
}
