"use client";

import React, { useState, useMemo } from "react";
import {
  Type,
  ImagePlus,
  Film,
  Bot,
  Crop,
  Clapperboard,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NODE_TYPES, NODE_META, type NodeTypeKey } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflow-store";

const ICON_MAP: Record<string, React.ReactNode> = {
  Type: <Type size={18} />,
  ImagePlus: <ImagePlus size={18} />,
  Film: <Film size={18} />,
  Bot: <Bot size={18} />,
  Crop: <Crop size={18} />,
  Clapperboard: <Clapperboard size={18} />,
};

const NODE_LIST: NodeTypeKey[] = [
  NODE_TYPES.TEXT,
  NODE_TYPES.UPLOAD_IMAGE,
  NODE_TYPES.UPLOAD_VIDEO,
  NODE_TYPES.LLM,
  NODE_TYPES.CROP_IMAGE,
  NODE_TYPES.EXTRACT_FRAME,
];

export default function LeftSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const addNode = useWorkflowStore((s) => s.addNode);

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return NODE_LIST;
    const q = search.toLowerCase();
    return NODE_LIST.filter((type) => {
      const meta = NODE_META[type];
      return (
        meta.label.toLowerCase().includes(q) ||
        meta.description.toLowerCase().includes(q)
      );
    });
  }, [search]);

  if (collapsed) {
    return (
      <div className="w-12 bg-[#141416] border-r border-[#2a2a2e] flex flex-col items-center py-3">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg hover:bg-[#1a1a1e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
        <div className="mt-4 space-y-2">
          {NODE_LIST.map((type) => {
            const meta = NODE_META[type];
            return (
              <button
                key={type}
                onClick={() => addNode(type)}
                className="p-2 rounded-lg hover:bg-[#1a1a1e] transition-colors"
                style={{ color: meta.color }}
                title={meta.label}
              >
                {ICON_MAP[meta.icon]}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-[#141416] border-r border-[#2a2a2e] flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2e]">
        <span className="text-sm font-semibold text-[#e4e4e7]">Nodes</span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-[#1a1a1e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#52525b]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full bg-[#0f0f11] border border-[#2a2a2e] rounded-lg pl-8 pr-3 py-1.5
              text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none
              focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Quick Access */}
      <div className="px-3 py-1">
        <span className="text-[10px] uppercase tracking-widest text-[#52525b] font-semibold">
          Quick Access
        </span>
      </div>

      {/* Node buttons */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {filteredNodes.map((type) => {
          const meta = NODE_META[type];
          return (
            <button
              key={type}
              onClick={() => addNode(type)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                hover:bg-[#1a1a1e] transition-all group cursor-grab active:cursor-grabbing
                border border-transparent hover:border-[#2a2a2e]"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                style={{
                  backgroundColor: meta.color + "15",
                  color: meta.color,
                }}
              >
                {ICON_MAP[meta.icon]}
              </div>
              <div className="text-left">
                <div className="text-sm text-[#e4e4e7] font-medium">
                  {meta.label}
                </div>
                <div className="text-[10px] text-[#52525b]">
                  {meta.description}
                </div>
              </div>
            </button>
          );
        })}
        {filteredNodes.length === 0 && (
          <p className="text-xs text-[#52525b] text-center py-4">
            No nodes found
          </p>
        )}
      </div>
    </div>
  );
}
