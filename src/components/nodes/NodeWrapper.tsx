"use client";

import React, { type ReactNode, useCallback, useState, useRef } from "react";
import { Handle, Position, useConnection } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import {
  NODE_INPUTS,
  NODE_OUTPUTS,
  HANDLE_COLORS,
  type NodeTypeKey,
  type HandleDef,
} from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflow-store";

interface NodeWrapperProps {
  id: string;
  type: NodeTypeKey;
  label: string;
  icon: ReactNode;
  color: string;
  isRunning?: boolean;
  error?: string;
  children: ReactNode;
}

function HandleDot({
  handle,
  position,
}: {
  handle: HandleDef;
  position: Position;
}) {
  const color = HANDLE_COLORS[handle.dataType];
  useConnection();

  return (
    <Handle
      type={position === Position.Left ? "target" : "source"}
      position={position}
      id={handle.id}
      className="!w-3 !h-3 !border-2 !border-[#1a1a1e] transition-all hover:!scale-125"
      style={{
        backgroundColor: color,
      }}
      title={`${handle.label} (${handle.dataType})`}
    />
  );
}

export default function NodeWrapper({
  id,
  type,
  label,
  icon,
  color,
  isRunning,
  error,
  children,
}: NodeWrapperProps) {
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const inputs = NODE_INPUTS[type] ?? [];
  const outputs = NODE_OUTPUTS[type] ?? [];
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(label);
  const labelInputRef = useRef<HTMLInputElement>(null);

  const onDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteNode(id);
    },
    [id, deleteNode]
  );

  const commitLabel = useCallback(() => {
    const trimmed = labelDraft.trim() || label;
    updateNodeData(id, { label: trimmed });
    setLabelDraft(trimmed);
    setEditingLabel(false);
  }, [id, labelDraft, label, updateNodeData]);

  return (
    <div
      className={`
        relative min-w-[240px] max-w-[320px] rounded-xl border bg-[#1a1a1e] text-[#e4e4e7]
        shadow-lg transition-all duration-200 group
        ${isRunning ? "animate-pulse-glow border-purple-500" : ""}
        ${error ? "border-red-500/70" : "border-[#2a2a2e] hover:border-[#3a3a3e]"}
      `}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-xl border-b border-[#2a2a2e]"
        style={{ borderTopColor: color, borderTopWidth: "2px" }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span style={{ color }}>{icon}</span>
          {editingLabel ? (
            <input
              ref={labelInputRef}
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") commitLabel();
                if (e.key === "Escape") { setLabelDraft(label); setEditingLabel(false); }
              }}
              className="nodrag flex-1 min-w-0 bg-transparent border-b border-purple-500/50 text-xs
                font-semibold uppercase tracking-wider text-[#e4e4e7] outline-none"
              autoFocus
            />
          ) : (
            <span
              className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]
                cursor-text hover:text-[#e4e4e7] transition-colors truncate"
              onDoubleClick={() => { setLabelDraft(label); setEditingLabel(true); }}
              title="Double-click to rename"
            >
              {label}
            </span>
          )}
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#2a2a2e] text-[#71717a] hover:text-red-400 shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="px-3 py-3 space-y-2">{children}</div>

      {/* Error display */}
      {error && (
        <div className="px-3 pb-2">
          <div className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1 border border-red-500/20">
            {error}
          </div>
        </div>
      )}

      {/* Input handles (left side) */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-evenly py-12">
        {inputs.map((handle) => (
          <div key={handle.id} className="relative -left-[6px]">
            <HandleDot handle={handle} position={Position.Left} />
          </div>
        ))}
      </div>

      {/* Output handles (right side) */}
      <div className="absolute right-0 top-0 h-full flex flex-col justify-evenly py-12">
        {outputs.map((handle) => (
          <div key={handle.id} className="relative -right-[6px]">
            <HandleDot handle={handle} position={Position.Right} />
          </div>
        ))}
      </div>
    </div>
  );
}
