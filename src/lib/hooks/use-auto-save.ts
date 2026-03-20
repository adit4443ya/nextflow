"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWorkflowStore } from "@/store/workflow-store";

/**
 * Auto-saves workflow state to the database with debouncing.
 * Creates a new workflow on first save, then updates on subsequent changes.
 */
export function useAutoSave() {
  const { workflowId, workflowName, nodes, edges, viewport } = useWorkflowStore();
  const setWorkflow = useWorkflowStore((s) => s.setWorkflow);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const initializedRef = useRef(false);

  const save = useCallback(async () => {
    if (isSavingRef.current) return;
    if (nodes.length === 0 && !workflowId) return; // Don't create empty workflows

    isSavingRef.current = true;

    try {
      if (workflowId) {
        // Update existing workflow
        await fetch(`/api/workflows/${workflowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: workflowName, nodes, edges, viewport }),
        });
      } else if (nodes.length > 0) {
        // Create new workflow
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: workflowName, nodes, edges, viewport }),
        });

        if (res.ok) {
          const data = await res.json();
          // Update store with the new workflow ID without resetting state
          setWorkflow(data.id, data.name, nodes, edges);
        }
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      isSavingRef.current = false;
    }
  }, [workflowId, workflowName, nodes, edges, viewport, setWorkflow]);

  // Debounced save on state changes
  useEffect(() => {
    // Skip the initial render
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(save, 1500); // 1.5s debounce

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes, edges, workflowName, viewport, save]);

  return { save, workflowId };
}
