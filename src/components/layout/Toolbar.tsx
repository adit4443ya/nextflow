"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  Play,
  PlayCircle,
  Undo2,
  Redo2,
  Download,
  Upload,
  Sparkles,
  ChevronDown,
  Square,
  Eraser,
  Trash2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useWorkflowStore } from "@/store/workflow-store";
import { useHistoryStore } from "@/store/history-store";
import {
  SAMPLE_NODES, SAMPLE_EDGES,
  PARALLEL_IMAGE_NODES, PARALLEL_IMAGE_EDGES,
  STORYBOARD_NODES, STORYBOARD_EDGES,
} from "@/lib/sample-workflow";
import { validateWorkflow } from "@/lib/dag-validation";
import { showToast } from "@/components/ui/Toast";
import { useRealtimeRun } from "@/lib/hooks/useRealtimeRun";

const SAMPLE_WORKFLOWS = [
  {
    name: "Product Marketing Kit",
    description: "Crop + Extract → 2 parallel tasks → converge",
    nodes: SAMPLE_NODES,
    edges: SAMPLE_EDGES,
  },
  {
    name: "Triple Parallel Analyst",
    description: "1 image → 3 LLMs fire simultaneously",
    nodes: PARALLEL_IMAGE_NODES,
    edges: PARALLEL_IMAGE_EDGES,
  },
  {
    name: "Video Storyboard",
    description: "1 video → 3 extractions → 3 LLMs (2 waves)",
    nodes: STORYBOARD_NODES,
    edges: STORYBOARD_EDGES,
  },
];

export default function Toolbar() {
  const {
    workflowId,
    workflowName,
    setWorkflowName,
    undo,
    redo,
    toJSON,
    setNodes,
    setEdges,
    selectedNodeIds,
    nodes,
    edges,
    updateNodeData,
    clearAllOutputs,
    clearCanvas,
  } = useWorkflowStore();

  const fetchRuns = useHistoryStore((s) => s.fetchRuns);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  useRealtimeRun(activeRunId, {
    onFinish: () => {
      setIsRunning(false);
      setActiveRunId(null);
      abortRef.current = null;
      if (workflowId) fetchRuns(workflowId);
    }
  });

  // Export workflow as JSON
  const handleExport = useCallback(() => {
    const data = toJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [toJSON, workflowName]);

  // Import workflow from JSON
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.nodes && data.edges) {
            setNodes(data.nodes);
            setEdges(data.edges);
          }
        } catch {
          alert("Invalid workflow file");
        }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [setNodes, setEdges]
  );

  // Execute workflow via API
  const runWorkflow = useCallback(
    async (selectedOnly: boolean) => {
      if (!workflowId) {
        showToast({
          type: "warning",
          title: "Save required",
          message: "Add at least one node to auto-save the workflow first.",
        });
        return;
      }
      if (isRunning) return;

      // DAG validation before execution
      const targetNodes = selectedOnly
        ? nodes.filter((n) => selectedNodeIds.has(n.id))
        : nodes;
      // For "Run Selected", include edges coming FROM non-selected upstream nodes too
      // so validation sees those inputs as connected (not "missing required input")
      const targetEdges = selectedOnly
        ? edges.filter((e) => selectedNodeIds.has(e.target))
        : edges;

      const validation = validateWorkflow(targetNodes, targetEdges);

      if (!validation.valid) {
        for (const error of validation.errors) {
          showToast({ type: "error", title: "Validation Error", message: error.message });
        }
        return;
      }

      for (const warning of validation.warnings) {
        showToast({ type: "warning", title: "Warning", message: warning.message });
      }

      setIsRunning(true);
      const abort = new AbortController();
      abortRef.current = abort;

      // Force-save current state before executing so DB has latest node data
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workflowName, nodes, edges }),
      });

      // Set running state on nodes
      const targetNodeIds = selectedOnly ? [...selectedNodeIds] : nodes.map((n) => n.id);
      for (const nodeId of targetNodeIds) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node && ["llmNode", "cropImageNode", "extractFrameNode"].includes(node.type || "")) {
          updateNodeData(nodeId, { isRunning: true, error: undefined, output: undefined });
        }
      }

      try {
        const body: any = {};
        if (selectedOnly && selectedNodeIds.size > 0) {
          body.selectedNodeIds = [...selectedNodeIds];
        }

        const res = await fetch(`/api/workflows/${workflowId}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abort.signal,
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || "Execution failed");
        }

        if (result.runId) {
          setActiveRunId(result.runId);
        } else {
          setIsRunning(false);
          abortRef.current = null;
        }

        showToast({
          type: "success",
          title: "Execution started",
          message: "Streaming live updates from backend...",
        });
      } catch (error: any) {
        for (const nodeId of targetNodeIds) {
          updateNodeData(nodeId, { isRunning: false });
        }
        if (error.name === "AbortError") {
          showToast({ type: "warning", title: "Cancelled", message: "Workflow run was cancelled." });
        } else {
          console.error("Execution failed:", error);
          showToast({ type: "error", title: "Execution Failed", message: error.message });
        }
        setIsRunning(false);
        abortRef.current = null;
      }
    },
    [workflowId, workflowName, isRunning, nodes, edges, selectedNodeIds, updateNodeData, fetchRuns]
  );

  const cancelRun = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <div className="h-12 bg-white/90 backdrop-blur-2xl border-b border-indigo-100/50 dark:bg-[#141416]/90 dark:border-[#2a2a2e] flex flex-col justify-center px-4 shrink-0 flex-1 z-20 relative shadow-[0_4px_24px_rgba(79,70,229,0.05)] dark:shadow-none">
      <div className="flex items-center justify-between w-full h-full">
        {/* Left: Workflow name */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <span className="text-purple-600 dark:text-purple-400 text-xs font-bold">N</span>
        </div>
        <input
          type="text"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="bg-transparent text-sm font-semibold text-indigo-950 border-none outline-none focus:bg-indigo-50/50 dark:text-[#e4e4e7] dark:focus:bg-[#1a1a1e] focus:px-2 focus:rounded transition-all w-48"
        />
        {workflowId && (
          <span className="text-[10px] text-indigo-500 bg-indigo-50 border border-indigo-100/50 dark:border-none dark:text-[#52525b] dark:bg-[#1a1a1e] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
            saved
          </span>
        )}
      </div>

      {/* Center: Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-[#1a1a1e] dark:text-[#71717a] dark:hover:text-[#e4e4e7] transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-[#1a1a1e] dark:text-[#71717a] dark:hover:text-[#e4e4e7] transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <div className="w-px h-5 bg-indigo-100 dark:bg-[#2a2a2e] mx-1" />

        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 dark:hover:bg-[#1a1a1e] dark:text-[#71717a] dark:hover:text-[#e4e4e7] transition-colors"
          title="Export workflow"
        >
          <Download size={14} />
          Export
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 dark:hover:bg-[#1a1a1e] dark:text-[#71717a] dark:hover:text-[#e4e4e7] transition-colors"
          title="Import workflow"
        >
          <Upload size={14} />
          Import
        </button>

        <div className="relative">
          <button
            onClick={() => setShowSampleMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
              hover:bg-purple-100 text-purple-600 dark:hover:bg-purple-900/20 dark:text-purple-400 transition-colors"
          >
            <Sparkles size={14} />
            Samples
            <ChevronDown size={11} />
          </button>

          {showSampleMenu && (
            <>
              {/* backdrop to close menu */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSampleMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-white/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(79,70,229,0.12)] border border-indigo-100/50 dark:bg-[#1a1a1e] dark:shadow-none dark:border-[#2a2a2e] rounded-xl overflow-hidden">
                {SAMPLE_WORKFLOWS.map((wf) => (
                  <button
                    key={wf.name}
                    onClick={() => {
                      if (confirm(`Load "${wf.name}"? This will replace your current canvas.`)) {
                        setNodes(wf.nodes as any);
                        setEdges(wf.edges as any);
                        setWorkflowName(wf.name);
                      }
                      setShowSampleMenu(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50/50 dark:hover:bg-[#222226] transition-colors border-b border-indigo-50 dark:border-[#2a2a2e] last:border-0"
                  >
                    <div className="text-xs font-bold text-indigo-950 dark:text-[#e4e4e7]">{wf.name}</div>
                    <div className="text-[10px] text-indigo-500 dark:text-[#52525b] mt-0.5">{wf.description}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={clearAllOutputs}
          disabled={nodes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 dark:hover:bg-[#1a1a1e] dark:text-[#71717a] dark:hover:text-[#e4e4e7] transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed"
          title="Clear all node outputs"
        >
          <Eraser size={14} />
          Clear Outputs
        </button>

        <button
          onClick={() => {
            if (nodes.length > 0 && confirm("Remove all nodes from canvas?")) {
              clearCanvas();
            }
          }}
          disabled={nodes.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
            text-indigo-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:text-[#71717a] dark:hover:text-red-400 transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed"
          title="Remove all nodes"
        >
          <Trash2 size={14} />
          Clear
        </button>

        <div className="w-px h-5 bg-indigo-100 dark:bg-[#2a2a2e] mx-1" />

        {selectedNodeIds.size > 0 ? (
          <button
            onClick={() => runWorkflow(true)}
            disabled={selectedNodeIds.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
              bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 dark:text-[#71717a] dark:hover:text-[#e4e4e7] dark:hover:bg-[#1a1a1e] dark:border-none shadow-sm transition-all hover:-translate-y-0.5
              disabled:opacity-30 disabled:cursor-not-allowed"
            title="Run selected nodes"
          >
            <PlayCircle size={14} />
            Run Selected
          </button>
        ) : isRunning ? (
          <button
            onClick={cancelRun}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
              bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/20 transition-all hover:scale-105 hover:-translate-y-0.5"
            title="Cancel running workflow"
          >
            <Square size={14} />
            Cancel
          </button>
        ) : (
          <button
            onClick={() => runWorkflow(false)}
            disabled={nodes.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold
              bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 hover:-translate-y-0.5
              disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0"
            title="Run full workflow"
          >
            <Play size={14} />
            Run All
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
