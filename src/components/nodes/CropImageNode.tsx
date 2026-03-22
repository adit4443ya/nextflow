"use client";

import React, { useCallback } from "react";
import { type NodeProps } from "@xyflow/react";
import { Crop, Loader2, X } from "lucide-react";
import NodeWrapper from "./NodeWrapper";
import { NODE_TYPES, type CropImageNodeData } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflow-store";

function ParamInput({
  label,
  value,
  onChange,
  disabled,
  connected,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  disabled: boolean;
  connected: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-[#71717a] w-16 shrink-0 flex items-center gap-1">
        {label}
        {connected && <span className="text-green-400">●</span>}
      </label>
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onKeyDown={(e) => e.stopPropagation()}
        disabled={disabled}
        className="nodrag w-full bg-[#0f0f11] border border-[#2a2a2e] rounded px-2 py-1
          text-xs text-[#e4e4e7] focus:outline-none focus:border-green-500/50
          transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </div>
  );
}

export default function CropImageNode({ id, data }: NodeProps) {
  const nodeData = data as CropImageNodeData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const edges = useWorkflowStore((s) => s.edges);

  const connectedInputs = new Set(
    edges
      .filter((e) => e.target === id && e.targetHandle)
      .map((e) => e.targetHandle!)
  );

  const updateParam = useCallback(
    (field: string, value: number) => {
      updateNodeData(id, { [field]: value });
    },
    [id, updateNodeData]
  );

  return (
    <NodeWrapper
      id={id}
      type={NODE_TYPES.CROP_IMAGE}
      label="Crop Image"
      icon={<Crop size={14} />}
      color="#22c55e"
      isRunning={nodeData.isRunning}
      error={nodeData.error}
    >
      {/* Image input indicator */}
      <div className="text-[10px] text-[#71717a] flex items-center gap-1">
        Image Input
        {connectedInputs.has("image_url") ? (
          <span className="text-green-400">● connected</span>
        ) : (
          <span className="text-red-400">● required</span>
        )}
      </div>

      {/* Crop parameters */}
      <div className="space-y-1">
        <ParamInput
          label="X %"
          value={nodeData.xPercent ?? 0}
          onChange={(v) => updateParam("xPercent", v)}
          disabled={connectedInputs.has("x_percent")}
          connected={connectedInputs.has("x_percent")}
        />
        <ParamInput
          label="Y %"
          value={nodeData.yPercent ?? 0}
          onChange={(v) => updateParam("yPercent", v)}
          disabled={connectedInputs.has("y_percent")}
          connected={connectedInputs.has("y_percent")}
        />
        <ParamInput
          label="Width %"
          value={nodeData.widthPercent ?? 100}
          onChange={(v) => updateParam("widthPercent", v)}
          disabled={connectedInputs.has("width_percent")}
          connected={connectedInputs.has("width_percent")}
        />
        <ParamInput
          label="Height %"
          value={nodeData.heightPercent ?? 100}
          onChange={(v) => updateParam("heightPercent", v)}
          disabled={connectedInputs.has("height_percent")}
          connected={connectedInputs.has("height_percent")}
        />
      </div>

      {nodeData.isRunning && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <Loader2 size={12} className="animate-spin" />
          Cropping...
        </div>
      )}

      {/* Output preview */}
      {nodeData.output && !nodeData.isRunning && (
        <div className="mt-1 border-t border-[#2a2a2e] pt-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-[#71717a] uppercase tracking-wider">Cropped</label>
            <button
              onClick={() => updateNodeData(id, { output: undefined, error: undefined })}
              className="nodrag p-0.5 rounded hover:bg-[#2a2a2e] text-[#52525b] hover:text-[#a1a1aa] transition-colors"
              title="Clear output"
            >
              <X size={10} />
            </button>
          </div>
          <img
            src={nodeData.output}
            alt="Cropped"
            className="w-full h-24 object-cover rounded-lg border border-[#2a2a2e]"
          />
        </div>
      )}
    </NodeWrapper>
  );
}
