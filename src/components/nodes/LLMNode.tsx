"use client";

import React, { useCallback, useState } from "react";
import { type NodeProps } from "@xyflow/react";
import { Bot, Loader2, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import NodeWrapper from "./NodeWrapper";
import { NODE_TYPES, type LLMNodeData } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflow-store";

const GROQ_MODELS = [
  { value: "groq:meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B (Vision)" },
  { value: "groq:llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
  { value: "groq:llama-3.1-8b-instant", label: "Llama 3.1 8B (fastest)" },
  { value: "groq:gemma2-9b-it", label: "Gemma 2 9B" },
];

export default function LLMNode({ id, data }: NodeProps) {
  const nodeData = data as LLMNodeData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const edges = useWorkflowStore((s) => s.edges);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const connectedInputs = new Set(
    edges
      .filter((e) => e.target === id && e.targetHandle)
      .map((e) => e.targetHandle!)
  );

  const onModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateNodeData(id, { model: e.target.value });
    },
    [id, updateNodeData]
  );

  const onSystemPromptChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { systemPrompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const onUserMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { userMessage: e.target.value });
    },
    [id, updateNodeData]
  );

  const temperature = nodeData.temperature ?? 0.7;
  const maxTokens = nodeData.maxTokens ?? 1024;

  return (
    <NodeWrapper
      id={id}
      type={NODE_TYPES.LLM}
      label="Run LLM"
      icon={<Bot size={14} />}
      color="#8b5cf6"
      isRunning={nodeData.isRunning}
      error={nodeData.error}
    >
      {/* Model selector */}
      <div>
        <label className="text-[10px] text-[#71717a] uppercase tracking-wider">Model</label>
        <select
          value={nodeData.model || "groq:meta-llama/llama-4-scout-17b-16e-instruct"}
          onChange={onModelChange}
          className="nodrag w-full bg-[#0f0f11] border border-[#2a2a2e] rounded-lg px-3 py-1.5
            text-xs text-[#e4e4e7] focus:outline-none focus:border-purple-500/50
            transition-colors cursor-pointer"
        >
          {GROQ_MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* System prompt */}
      <div>
        <label className="text-[10px] text-[#71717a] uppercase tracking-wider flex items-center gap-1">
          System Prompt
          {connectedInputs.has("system_prompt") && (
            <span className="text-purple-400 text-[9px]">● connected</span>
          )}
        </label>
        <textarea
          value={nodeData.systemPrompt || ""}
          onChange={onSystemPromptChange}
          onKeyDown={(e) => e.stopPropagation()}
          disabled={connectedInputs.has("system_prompt")}
          placeholder={connectedInputs.has("system_prompt") ? "Connected from upstream node" : "Optional system instructions..."}
          rows={2}
          className="nodrag nowheel w-full bg-[#0f0f11] border border-[#2a2a2e] rounded-lg px-3 py-1.5
            text-xs text-[#e4e4e7] placeholder-[#52525b] resize-none focus:outline-none
            focus:border-purple-500/50 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      {/* User message */}
      <div>
        <label className="text-[10px] text-[#71717a] uppercase tracking-wider flex items-center gap-1">
          User Message <span className="text-red-400">*</span>
          {connectedInputs.has("user_message") && (
            <span className="text-purple-400 text-[9px]">● connected</span>
          )}
        </label>
        <textarea
          value={nodeData.userMessage || ""}
          onChange={onUserMessageChange}
          onKeyDown={(e) => e.stopPropagation()}
          disabled={connectedInputs.has("user_message")}
          placeholder={connectedInputs.has("user_message") ? "Connected from upstream node" : "Enter message for the LLM..."}
          rows={2}
          className="nodrag nowheel w-full bg-[#0f0f11] border border-[#2a2a2e] rounded-lg px-3 py-1.5
            text-xs text-[#e4e4e7] placeholder-[#52525b] resize-none focus:outline-none
            focus:border-purple-500/50 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>

      {/* Images indicator */}
      {connectedInputs.has("images") && (
        <div className="text-[10px] text-green-400 flex items-center gap-1">
          <span>●</span> Image input connected
        </div>
      )}

      {/* Advanced settings toggle */}
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="nodrag flex items-center gap-1 text-[10px] text-[#52525b] hover:text-[#71717a] transition-colors"
      >
        <Settings2 size={10} />
        Advanced
        {showAdvanced ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {showAdvanced && (
        <div className="space-y-2 border-t border-[#2a2a2e] pt-2">
          {/* Temperature */}
          <div>
            <label className="text-[10px] text-[#71717a] uppercase tracking-wider flex items-center justify-between">
              Temperature
              <span className="text-purple-400 font-mono">{temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => updateNodeData(id, { temperature: parseFloat(e.target.value) })}
              className="nodrag w-full h-1 accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[#52525b] mt-0.5">
              <span>0 Precise</span>
              <span>1 Balanced</span>
              <span>2 Creative</span>
            </div>
          </div>

          {/* Max tokens */}
          <div>
            <label className="text-[10px] text-[#71717a] uppercase tracking-wider">
              Max Tokens
            </label>
            <input
              type="number"
              min={64}
              max={8000}
              step={64}
              value={maxTokens}
              onChange={(e) => updateNodeData(id, { maxTokens: parseInt(e.target.value) || 1024 })}
              onKeyDown={(e) => e.stopPropagation()}
              className="nodrag w-full bg-[#0f0f11] border border-[#2a2a2e] rounded px-2 py-1
                text-xs text-[#e4e4e7] focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Running indicator */}
      {nodeData.isRunning && (
        <div className="flex items-center gap-2 text-xs text-purple-400">
          <Loader2 size={12} className="animate-spin" />
          Running...
        </div>
      )}

      {/* Output display */}
      {nodeData.output && !nodeData.isRunning && (
        <div className="mt-1 border-t border-[#2a2a2e] pt-2">
          <label className="text-[10px] text-[#71717a] uppercase tracking-wider">Output</label>
          <div className="bg-[#0f0f11] rounded-lg px-3 py-2 text-xs text-[#a1a1aa] max-h-40 overflow-y-auto nowheel">
            {nodeData.output}
          </div>
        </div>
      )}
    </NodeWrapper>
  );
}
