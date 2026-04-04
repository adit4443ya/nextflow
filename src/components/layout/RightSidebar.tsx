"use client";

import React, { useState } from "react";
import {
  History,
  ChevronRight,
  ChevronLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { useHistoryStore, type RunData } from "@/store/history-store";

const STATUS_ICON = {
  SUCCESS: <CheckCircle2 size={14} className="text-emerald-600 dark:text-green-400" />,
  FAILED: <XCircle size={14} className="text-red-600 dark:text-red-400" />,
  RUNNING: <Loader2 size={14} className="text-amber-600 dark:text-yellow-400 animate-spin" />,
};

const STATUS_COLOR = {
  SUCCESS: "border-emerald-200 bg-emerald-50 dark:border-green-500/30 dark:bg-green-500/5",
  FAILED: "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/5",
  RUNNING: "border-amber-200 bg-amber-50 dark:border-yellow-500/30 dark:bg-yellow-500/5",
};

const SCOPE_LABEL = {
  FULL: "Full Workflow",
  PARTIAL: "Selected Nodes",
  SINGLE: "Single Node",
};

function RunEntry({ run }: { run: RunData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${STATUS_COLOR[run.status]}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {STATUS_ICON[run.status]}
            <span className="text-xs font-semibold text-indigo-950 dark:text-[#e4e4e7]">
              {SCOPE_LABEL[run.scope]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {run.duration != null && (
              <span className="text-[10px] text-indigo-500 dark:text-[#71717a] font-medium">
                {(run.duration / 1000).toFixed(1)}s
              </span>
            )}
            <ChevronDown
              size={12}
              className={`text-indigo-400 dark:text-[#52525b] transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>
        <div className="text-[10px] text-indigo-400 dark:text-[#52525b] mt-1 font-medium">
          {new Date(run.startedAt).toLocaleString()}
        </div>
      </button>

      {expanded && run.nodeRuns && run.nodeRuns.length > 0 && (
        <div className="ml-2 mt-1 space-y-0.5 border-l-2 border-indigo-100 dark:border-[#2a2a2e] pl-3 py-1">
          {run.nodeRuns.map((nr) => (
            <div key={nr.id || nr.nodeId} className="text-xs py-1">
              <div className="flex items-center gap-1.5">
                {STATUS_ICON[nr.status]}
                <span className="text-indigo-800 dark:text-[#a1a1aa] font-semibold">{nr.nodeName}</span>
                {nr.duration != null && (
                  <span className="text-[10px] text-indigo-400 dark:text-[#52525b] ml-auto font-medium">
                    {(nr.duration / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              {nr.output && (
                <div className="text-[10px] text-indigo-500 dark:text-[#52525b] mt-0.5 pl-5 truncate max-w-[220px]">
                  Output: {nr.output.length > 80 ? nr.output.slice(0, 80) + "..." : nr.output}
                </div>
              )}
              {nr.error && (
                <div className="text-[10px] text-red-500 dark:text-red-400 mt-0.5 pl-5">
                  Error: {nr.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RightSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { runs, isLoading } = useHistoryStore();

  if (collapsed) {
    return (
      <div className="w-12 bg-white/90 border-l border-indigo-100/50 shadow-[-4px_0_24px_rgba(79,70,229,0.05)] backdrop-blur-2xl dark:bg-[#141416]/90 dark:border-[#2a2a2e] dark:shadow-none flex flex-col items-center py-3 z-10 transition-all">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-700 dark:hover:bg-[#1a1a1e] dark:text-[#71717a] dark:hover:text-[#e4e4e7] transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="mt-4">
          <History size={16} className="text-indigo-300 dark:text-[#52525b]" />
        </div>
        {runs.length > 0 && (
          <div className="mt-2 w-5 h-5 rounded-full bg-indigo-100 dark:bg-purple-500/20 flex items-center justify-center">
            <span className="text-[9px] text-indigo-700 font-bold dark:text-purple-400">{runs.length}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-72 bg-white/90 border-l border-indigo-100/50 shadow-[-4px_0_24px_rgba(79,70,229,0.05)] backdrop-blur-2xl dark:bg-[#141416]/90 dark:border-[#2a2a2e] dark:shadow-none flex flex-col shrink-0 z-10 transition-all">
      <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-50 dark:border-[#2a2a2e]">
        <div className="flex items-center gap-2">
          <History size={14} className="text-indigo-400 dark:text-[#71717a]" />
          <span className="text-sm font-bold text-indigo-950 dark:text-[#e4e4e7]">History</span>
          {runs.length > 0 && (
            <span className="text-[10px] text-indigo-600 bg-indigo-50 dark:text-[#52525b] dark:bg-[#1a1a1e] px-1.5 py-0.5 rounded font-semibold border border-indigo-100/50 dark:border-none">
              {runs.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-indigo-50 text-indigo-400 hover:text-indigo-700 dark:hover:bg-[#1a1a1e] dark:text-[#71717a] dark:hover:text-[#e4e4e7] transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-indigo-300 dark:text-[#52525b] animate-spin" />
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-indigo-300 dark:text-[#52525b]">
            <Clock size={32} className="mb-2 opacity-30" />
            <p className="text-xs font-semibold">No workflow runs yet</p>
            <p className="text-[10px] mt-1 text-center px-4 font-medium opacity-80">
              Click &quot;Run All&quot; to execute your workflow and see history here
            </p>
          </div>
        ) : (
          runs.map((run) => <RunEntry key={run.id} run={run} />)
        )}
      </div>
    </div>
  );
}
