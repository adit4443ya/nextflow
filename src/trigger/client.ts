/**
 * Trigger.dev Client — task trigger helpers (v4 API)
 *
 * Uses tasks.trigger() + runs.poll() to trigger tasks on Trigger.dev
 * infrastructure and wait for results. Falls back to direct execution
 * if Trigger.dev is not configured (TRIGGER_SECRET_KEY not set).
 */

import { tasks, runs } from "@trigger.dev/sdk/v3";
import type { runLLMTask } from "./tasks/run-llm";
import type { cropImageTask } from "./tasks/crop-image";
import type { extractFrameTask } from "./tasks/extract-frame";

export function isTriggerConfigured(): boolean {
  return !!process.env.TRIGGER_SECRET_KEY;
}

export async function triggerLLM(payload: {
  provider: "groq" | "openrouter";
  model: string;
  systemPrompt: string;
  userMessage: string;
  imageUrls: string[];
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ output: string }> {
  const handle = await tasks.trigger<typeof runLLMTask>("run-llm", payload);
  const run = await runs.poll(handle.id, { pollIntervalMs: 500 });

  if (run.isCompleted && run.output) {
    return run.output as { output: string };
  }

  throw new Error(
    run.status === "FAILED"
      ? `LLM task failed`
      : `LLM task ended with status: ${run.status}`
  );
}

export async function triggerCropImage(payload: {
  imageUrl: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}): Promise<{ output: string; width: number; height: number }> {
  const handle = await tasks.trigger<typeof cropImageTask>("crop-image", payload);
  const run = await runs.poll(handle.id, { pollIntervalMs: 500 });

  if (run.isCompleted && run.output) {
    return run.output as { output: string; width: number; height: number };
  }

  throw new Error(
    run.status === "FAILED"
      ? `Crop task failed`
      : `Crop task ended with status: ${run.status}`
  );
}

export async function triggerExtractFrame(payload: {
  videoUrl: string;
  timestamp: string;
}): Promise<{ output: string }> {
  const handle = await tasks.trigger<typeof extractFrameTask>("extract-frame", payload);
  const run = await runs.poll(handle.id, { pollIntervalMs: 500 });

  if (run.isCompleted && run.output) {
    return run.output as { output: string };
  }

  throw new Error(
    run.status === "FAILED"
      ? `Extract frame task failed`
      : `Extract frame task ended with status: ${run.status}`
  );
}
