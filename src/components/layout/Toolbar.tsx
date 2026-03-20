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
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useHistoryStore } from "@/store/history-store";
import {
  SAMPLE_NODES, SAMPLE_EDGES,
  PARALLEL_IMAGE_NODES, PARALLEL_IMAGE_EDGES,
  STORYBOARD_NODES, STORYBOARD_EDGES,
} from "@/lib/sample-workflow";
import { validateWorkflow } from "@/lib/dag-validation";
import { showToast } from "@/components/ui/Toast";

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
  } = useWorkflowStore();

  const fetchRuns = useHistoryStore((s) => s.fetchRuns);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showSampleMenu, setShowSampleMenu] = useState(false);

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

        // Update nodes with their outputs
        if (result.outputs) {
          for (const [nodeId, output] of Object.entries(result.outputs)) {
            updateNodeData(nodeId, {
              output: typeof output === "string" ? output : JSON.stringify(output),
              isRunning: false,
              error: undefined,
            });
          }
        }

        // Surface per-node errors directly on the failed nodes
        if (result.errors) {
          for (const [nodeId, errorMsg] of Object.entries(result.errors as Record<string, string>)) {
            updateNodeData(nodeId, { error: errorMsg, isRunning: false });
          }
        }

        // Clear running state for nodes that didn't produce output or error
        for (const nodeId of targetNodeIds) {
          updateNodeData(nodeId, { isRunning: false });
        }

        // Refresh history
        if (workflowId) {
          fetchRuns(workflowId);
        }

        showToast({
          type: result.status === "SUCCESS" ? "success" : "warning",
          title: result.status === "SUCCESS" ? "Workflow completed" : "Workflow completed with errors",
          message: `Run finished in ${result.runId ? "view history for details" : "unknown time"}`,
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
      } finally {
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
    <div className="h-12 bg-[#141416] border-b border-[#2a2a2e] flex items-center justify-between px-4 shrink-0 flex-1">
      {/* Left: Workflow name */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <span className="text-purple-400 text-xs font-bold">N</span>
        </div>
        <input
          type="text"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="bg-transparent text-sm font-medium text-[#e4e4e7] border-none outline-none
            focus:bg-[#1a1a1e] focus:px-2 focus:rounded transition-all w-48"
        />
        {workflowId && (
          <span className="text-[10px] text-[#52525b] bg-[#1a1a1e] px-2 py-0.5 rounded">
            saved
          </span>
        )}
      </div>

      {/* Center: Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          className="p-2 rounded-lg hover:bg-[#1a1a1e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          className="p-2 rounded-lg hover:bg-[#1a1a1e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
            hover:bg-[#1a1a1e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
            hover:bg-[#1a1a1e] text-[#71717a] hover:text-[#e4e4e7] transition-colors"
          title="Import workflow"
        >
          <Upload size={14} />
          Import
        </button>

        <div className="relative">
          <button
            onClick={() => setShowSampleMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
              hover:bg-purple-500/10 text-purple-400/70 hover:text-purple-400 transition-colors"
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
              <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-[#1a1a1e] border border-[#2a2a2e] rounded-xl shadow-xl overflow-hidden">
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
                    className="w-full text-left px-4 py-3 hover:bg-[#222226] transition-colors border-b border-[#2a2a2e] last:border-0"
                  >
                    <div className="text-xs font-medium text-[#e4e4e7]">{wf.name}</div>
                    <div className="text-[10px] text-[#52525b] mt-0.5">{wf.description}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="w-px h-5 bg-[#2a2a2e] mx-1" />

        {!isRunning && (
          <button
            onClick={() => runWorkflow(true)}
            disabled={selectedNodeIds.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
              text-[#71717a] hover:text-[#e4e4e7] hover:bg-[#1a1a1e] transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed"
            title="Run selected nodes"
          >
            <PlayCircle size={14} />
            Run Selected
          </button>
        )}

        {isRunning ? (
          <button
            onClick={cancelRun}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-red-600 hover:bg-red-500 text-white transition-colors"
            title="Cancel running workflow"
          >
            <Square size={14} />
            Cancel
          </button>
        ) : (
          <button
            onClick={() => runWorkflow(false)}
            disabled={nodes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-purple-600 hover:bg-purple-500 text-white transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
            title="Run full workflow"
          >
            <Play size={14} />
            Run All
          </button>
        )}
      </div>
    </div>
  );
}
