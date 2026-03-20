import { create } from "zustand";

export interface NodeRunData {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeName: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  duration: number | null;
  output: string | null;
  error: string | null;
  startedAt: string;
}

export interface RunData {
  id: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  scope: "FULL" | "PARTIAL" | "SINGLE";
  duration: number | null;
  startedAt: string;
  completedAt: string | null;
  nodeRuns: NodeRunData[];
}

interface HistoryState {
  runs: RunData[];
  isLoading: boolean;
  error: string | null;

  fetchRuns: (workflowId: string) => Promise<void>;
  addRun: (run: RunData) => void;
  updateRun: (runId: string, data: Partial<RunData>) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  runs: [],
  isLoading: false,
  error: null,

  fetchRuns: async (workflowId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/runs?workflowId=${workflowId}`);
      if (!res.ok) throw new Error("Failed to fetch runs");
      const data = await res.json();
      set({ runs: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addRun: (run) => {
    set({ runs: [run, ...get().runs] });
  },

  updateRun: (runId, data) => {
    set({
      runs: get().runs.map((r) =>
        r.id === runId ? { ...r, ...data } : r
      ),
    });
  },

  clear: () => set({ runs: [], error: null }),
}));
