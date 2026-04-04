import { useEffect } from "react";
import { useWorkflowStore } from "@/store/workflow-store";

interface UseRealtimeRunOptions {
  onFinish?: () => void;
}

export function useRealtimeRun(runId: string | null, options?: UseRealtimeRunOptions) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  useEffect(() => {
    if (!runId) return;

    let stopped = false;

    const interval = setInterval(async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/runs/${runId}`);
        if (!res.ok) return;
        const record = await res.json();
        
        // Loop over nodeRuns and patch the workflow store
        for (const nr of record.nodeRuns) {
          if (nr.status === "SUCCESS") {
            let parsedOutput = undefined;
            if (nr.output) {
              try {
                parsedOutput = JSON.parse(nr.output);
                // Extract directly if wrapped in { value: ... }
                if (typeof parsedOutput === "object" && parsedOutput !== null && "value" in parsedOutput) {
                   parsedOutput = parsedOutput.value;
                }
              } catch (e) {
                parsedOutput = nr.output;
              }
            }
            updateNodeData(nr.nodeId, {
              isRunning: false,
              output: parsedOutput,
              error: undefined
            });
          } else if (nr.status === "FAILED") {
            updateNodeData(nr.nodeId, {
              isRunning: false,
              error: nr.error || "Failed",
            });
          } else if (nr.status === "RUNNING") {
            updateNodeData(nr.nodeId, {
              isRunning: true,
              error: undefined
            });
          }
        }
        
        // stop polling if workflow is finished
        if (["SUCCESS", "FAILED", "CANCELLED"].includes(record.status)) {
          clearInterval(interval);
          stopped = true;
          if (options?.onFinish) {
            options.onFinish();
          }
        }
        
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      stopped = true;
    };
  }, [runId, updateNodeData, options]);
}
