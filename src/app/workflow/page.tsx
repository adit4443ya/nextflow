"use client";

import React, { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { UserButton } from "@clerk/nextjs";
import LeftSidebar from "@/components/layout/LeftSidebar";
import RightSidebar from "@/components/layout/RightSidebar";
import Toolbar from "@/components/layout/Toolbar";
import WorkflowCanvas from "@/components/canvas/WorkflowCanvas";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import { useWorkflowStore } from "@/store/workflow-store";
import { useHistoryStore } from "@/store/history-store";
import { ToastContainer } from "@/components/ui/Toast";

function WorkflowEditor() {
  const { workflowId } = useAutoSave();
  const setWorkflow = useWorkflowStore((s) => s.setWorkflow);
  const fetchRuns = useHistoryStore((s) => s.fetchRuns);
  const clearHistory = useHistoryStore((s) => s.clear);

  // Clear history when this page unmounts (i.e. on logout/redirect)
  useEffect(() => {
    return () => { clearHistory(); };
  }, [clearHistory]);

  // Load most recent workflow on mount
  useEffect(() => {
    async function loadLatestWorkflow() {
      try {
        const res = await fetch("/api/workflows");
        if (!res.ok) return;
        const workflows = await res.json();
        if (workflows.length > 0) {
          const latest = workflows[0];
          // Fetch full workflow data
          const fullRes = await fetch(`/api/workflows/${latest.id}`);
          if (!fullRes.ok) return;
          const full = await fullRes.json();
          setWorkflow(full.id, full.name, full.nodes || [], full.edges || [], full.viewport || undefined);
        }
      } catch (err) {
        console.error("Failed to load workflow:", err);
      }
    }
    loadLatestWorkflow();
  }, [setWorkflow]);

  // Load history when workflowId is available
  useEffect(() => {
    if (workflowId) {
      fetchRuns(workflowId);
    }
  }, [workflowId, fetchRuns]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white dark:bg-[#0a0a0b] transition-colors">
      {/* Top toolbar */}
      <div className="flex items-center">
        <Toolbar />
        <div className="h-12 bg-white/90 backdrop-blur-2xl border-b border-l border-indigo-100/50 dark:bg-[#141416]/90 dark:border-[#2a2a2e] dark:border-l-[#2a2a2e] flex items-center px-4 z-20 relative shadow-[0_4px_24px_rgba(79,70,229,0.05)] dark:shadow-none transition-all">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-7 h-7",
              },
            }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <WorkflowCanvas />
        <RightSidebar />
      </div>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <ReactFlowProvider>
      <WorkflowEditor />
    </ReactFlowProvider>
  );
}
