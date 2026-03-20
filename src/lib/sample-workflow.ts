import type { WorkflowNode, WorkflowEdge } from "@/types/nodes";

// ============================================================
// Workflow 1: Product Marketing Kit Generator
//
// Execution phases:
//   Phase 0: [Upload Image] [Upload Video] [Text×3]  — instant
//   Phase 1: [Crop Image] [Extract Frame]             — 2 parallel Trigger.dev tasks
//   Phase 2: [LLM: Product Desc]                     — waits for both above
//   Phase 3: [LLM: Final Post]                       — waits for LLM above
// ============================================================
export const SAMPLE_NODES: WorkflowNode[] = [
  {
    id: "node_img1",
    type: "uploadImageNode",
    position: { x: 50, y: 50 },
    data: { label: "Upload Image" },
  },
  {
    id: "node_crop1",
    type: "cropImageNode",
    position: { x: 350, y: 50 },
    data: {
      label: "Crop Image",
      xPercent: 10,
      yPercent: 10,
      widthPercent: 80,
      heightPercent: 80,
    },
  },
  {
    id: "node_text1",
    type: "textNode",
    position: { x: 50, y: 280 },
    data: {
      label: "System Prompt",
      text: "You are a professional marketing copywriter. Generate a compelling one-paragraph product description.",
      output: "You are a professional marketing copywriter. Generate a compelling one-paragraph product description.",
    },
  },
  {
    id: "node_text2",
    type: "textNode",
    position: { x: 50, y: 450 },
    data: {
      label: "Product Details",
      text: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
      output: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
    },
  },
  {
    id: "node_llm1",
    type: "llmNode",
    position: { x: 700, y: 150 },
    data: { label: "LLM - Product Description", model: "groq:meta-llama/llama-4-scout-17b-16e-instruct" },
  },
  {
    id: "node_vid1",
    type: "uploadVideoNode",
    position: { x: 50, y: 650 },
    data: { label: "Upload Video" },
  },
  {
    id: "node_extract1",
    type: "extractFrameNode",
    position: { x: 350, y: 650 },
    data: { label: "Extract Frame", timestamp: "50%" },
  },
  {
    id: "node_text3",
    type: "textNode",
    position: { x: 700, y: 500 },
    data: {
      label: "Social Media Prompt",
      text: "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.",
      output: "You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.",
    },
  },
  {
    id: "node_llm2",
    type: "llmNode",
    position: { x: 1100, y: 350 },
    data: { label: "LLM - Final Marketing Post", model: "groq:meta-llama/llama-4-scout-17b-16e-instruct" },
  },
];

export const SAMPLE_EDGES: WorkflowEdge[] = [
  { id: "edge_img_crop",    source: "node_img1",    target: "node_crop1",   sourceHandle: "output", targetHandle: "image_url",     type: "animatedEdge", animated: true },
  { id: "edge_crop_llm1",   source: "node_crop1",   target: "node_llm1",    sourceHandle: "output", targetHandle: "images",         type: "animatedEdge", animated: true },
  { id: "edge_text1_llm1",  source: "node_text1",   target: "node_llm1",    sourceHandle: "output", targetHandle: "system_prompt",  type: "animatedEdge", animated: true },
  { id: "edge_text2_llm1",  source: "node_text2",   target: "node_llm1",    sourceHandle: "output", targetHandle: "user_message",   type: "animatedEdge", animated: true },
  { id: "edge_vid_extract", source: "node_vid1",    target: "node_extract1",sourceHandle: "output", targetHandle: "video_url",      type: "animatedEdge", animated: true },
  { id: "edge_text3_llm2",  source: "node_text3",   target: "node_llm2",    sourceHandle: "output", targetHandle: "system_prompt",  type: "animatedEdge", animated: true },
  { id: "edge_llm1_llm2",   source: "node_llm1",    target: "node_llm2",    sourceHandle: "output", targetHandle: "user_message",   type: "animatedEdge", animated: true },
  { id: "edge_crop_llm2",   source: "node_crop1",   target: "node_llm2",    sourceHandle: "output", targetHandle: "images",         type: "animatedEdge", animated: true },
  { id: "edge_extract_llm2",source: "node_extract1",target: "node_llm2",    sourceHandle: "output", targetHandle: "images",         type: "animatedEdge", animated: true },
];

// ============================================================
// Workflow 2: Triple Parallel Image Analyst
//
// ONE image → THREE LLMs fire simultaneously in Phase 1.
// Clearest demo of a single phase with 3 concurrent Trigger.dev tasks.
//
// Execution phases:
//   Phase 0: [Upload Image] [Text Haiku] [Text Caption] [Text Art]  — instant
//   Phase 1: [LLM Haiku] [LLM Caption] [LLM Art Critic]             — 3 PARALLEL tasks
// ============================================================
export const PARALLEL_IMAGE_NODES: WorkflowNode[] = [
  {
    id: "pi_img",
    type: "uploadImageNode",
    position: { x: 50, y: 350 },
    data: { label: "Upload Image" },
  },
  {
    id: "pi_text_haiku",
    type: "textNode",
    position: { x: 50, y: 50 },
    data: {
      label: "Haiku Prompt",
      text: "Write a short, vivid haiku inspired by this image.",
      output: "Write a short, vivid haiku inspired by this image.",
    },
  },
  {
    id: "pi_text_caption",
    type: "textNode",
    position: { x: 50, y: 500 },
    data: {
      label: "Caption Prompt",
      text: "Write a punchy, engaging Instagram caption for this image. Include 3 relevant hashtags.",
      output: "Write a punchy, engaging Instagram caption for this image. Include 3 relevant hashtags.",
    },
  },
  {
    id: "pi_text_art",
    type: "textNode",
    position: { x: 50, y: 750 },
    data: {
      label: "Art Critic Prompt",
      text: "Analyze this image like an art critic. Describe the composition, color palette, mood, and visual storytelling in 2-3 sentences.",
      output: "Analyze this image like an art critic. Describe the composition, color palette, mood, and visual storytelling in 2-3 sentences.",
    },
  },
  {
    id: "pi_llm_haiku",
    type: "llmNode",
    position: { x: 500, y: 50 },
    data: { label: "LLM — Haiku Writer", model: "groq:meta-llama/llama-4-scout-17b-16e-instruct" },
  },
  {
    id: "pi_llm_caption",
    type: "llmNode",
    position: { x: 500, y: 400 },
    data: { label: "LLM — Caption Writer", model: "groq:meta-llama/llama-4-scout-17b-16e-instruct" },
  },
  {
    id: "pi_llm_art",
    type: "llmNode",
    position: { x: 500, y: 750 },
    data: { label: "LLM — Art Critic", model: "groq:meta-llama/llama-4-scout-17b-16e-instruct" },
  },
];

export const PARALLEL_IMAGE_EDGES: WorkflowEdge[] = [
  // Image fans out to all 3 LLMs
  { id: "pi_e1", source: "pi_img", target: "pi_llm_haiku",   sourceHandle: "output", targetHandle: "images",       type: "animatedEdge", animated: true },
  { id: "pi_e2", source: "pi_img", target: "pi_llm_caption", sourceHandle: "output", targetHandle: "images",       type: "animatedEdge", animated: true },
  { id: "pi_e3", source: "pi_img", target: "pi_llm_art",     sourceHandle: "output", targetHandle: "images",       type: "animatedEdge", animated: true },
  // Each text node → its own LLM
  { id: "pi_e4", source: "pi_text_haiku",   target: "pi_llm_haiku",   sourceHandle: "output", targetHandle: "user_message", type: "animatedEdge", animated: true },
  { id: "pi_e5", source: "pi_text_caption", target: "pi_llm_caption", sourceHandle: "output", targetHandle: "user_message", type: "animatedEdge", animated: true },
  { id: "pi_e6", source: "pi_text_art",     target: "pi_llm_art",     sourceHandle: "output", targetHandle: "user_message", type: "animatedEdge", animated: true },
];

// ============================================================
// Workflow 3: Video Storyboard Extractor
//
// ONE video → 3 ExtractFrame tasks fire in parallel (Phase 1),
// then 3 LLM analysis tasks fire in parallel (Phase 2).
// Two full waves of parallelism.
//
// Execution phases:
//   Phase 0: [Upload Video] [Text Opening] [Text Middle] [Text Ending]  — instant
//   Phase 1: [Extract 0%] [Extract 50%] [Extract 90%]                   — 3 PARALLEL frame extractions
//   Phase 2: [LLM Opening] [LLM Middle] [LLM Ending]                    — 3 PARALLEL LLM analyses
// ============================================================
export const STORYBOARD_NODES: WorkflowNode[] = [
  {
    id: "sb_vid",
    type: "uploadVideoNode",
    position: { x: 50, y: 400 },
    data: { label: "Upload Video" },
  },

  // 3 extract frame nodes — each grabs a different moment
  {
    id: "sb_ex0",
    type: "extractFrameNode",
    position: { x: 380, y: 100 },
    data: { label: "Extract — Opening (0%)", timestamp: "0%" },
  },
  {
    id: "sb_ex50",
    type: "extractFrameNode",
    position: { x: 380, y: 380 },
    data: { label: "Extract — Middle (50%)", timestamp: "50%" },
  },
  {
    id: "sb_ex90",
    type: "extractFrameNode",
    position: { x: 380, y: 660 },
    data: { label: "Extract — Ending (90%)", timestamp: "90%" },
  },

  // 3 text prompts — one per LLM
  {
    id: "sb_txt0",
    type: "textNode",
    position: { x: 380, y: 50 },
    data: {
      label: "Opening Question",
      text: "What is happening in this opening scene? Describe the setting, subjects, and mood in 2 sentences.",
      output: "What is happening in this opening scene? Describe the setting, subjects, and mood in 2 sentences.",
    },
  },
  {
    id: "sb_txt50",
    type: "textNode",
    position: { x: 380, y: 330 },
    data: {
      label: "Middle Question",
      text: "Describe what is happening in this mid-point scene. How does it contrast with or continue from an opening?",
      output: "Describe what is happening in this mid-point scene. How does it contrast with or continue from an opening?",
    },
  },
  {
    id: "sb_txt90",
    type: "textNode",
    position: { x: 380, y: 610 },
    data: {
      label: "Ending Question",
      text: "Analyze this ending scene. What conclusion or resolution does it suggest? What emotions does it evoke?",
      output: "Analyze this ending scene. What conclusion or resolution does it suggest? What emotions does it evoke?",
    },
  },

  // 3 LLM nodes — each analyzes one frame
  {
    id: "sb_llm0",
    type: "llmNode",
    position: { x: 800, y: 100 },
    data: { label: "LLM — Opening Analysis", model: "groq:meta-llama/llama-4-scout-17b-16e-instruct" },
  },
  {
    id: "sb_llm50",
    type: "llmNode",
    position: { x: 800, y: 380 },
    data: { label: "LLM — Middle Analysis", model: "groq:meta-llama/llama-4-scout-17b-16e-instruct" },
  },
  {
    id: "sb_llm90",
    type: "llmNode",
    position: { x: 800, y: 660 },
    data: { label: "LLM — Ending Analysis", model: "groq:meta-llama/llama-4-scout-17b-16e-instruct" },
  },
];

export const STORYBOARD_EDGES: WorkflowEdge[] = [
  // Video fans out to all 3 extract nodes (Phase 1 parallelism)
  { id: "sb_e1", source: "sb_vid",  target: "sb_ex0",   sourceHandle: "output", targetHandle: "video_url",    type: "animatedEdge", animated: true },
  { id: "sb_e2", source: "sb_vid",  target: "sb_ex50",  sourceHandle: "output", targetHandle: "video_url",    type: "animatedEdge", animated: true },
  { id: "sb_e3", source: "sb_vid",  target: "sb_ex90",  sourceHandle: "output", targetHandle: "video_url",    type: "animatedEdge", animated: true },

  // Each frame → its LLM (images handle)
  { id: "sb_e4", source: "sb_ex0",  target: "sb_llm0",  sourceHandle: "output", targetHandle: "images",       type: "animatedEdge", animated: true },
  { id: "sb_e5", source: "sb_ex50", target: "sb_llm50", sourceHandle: "output", targetHandle: "images",       type: "animatedEdge", animated: true },
  { id: "sb_e6", source: "sb_ex90", target: "sb_llm90", sourceHandle: "output", targetHandle: "images",       type: "animatedEdge", animated: true },

  // Each text prompt → its LLM (user_message handle)
  { id: "sb_e7", source: "sb_txt0",  target: "sb_llm0",  sourceHandle: "output", targetHandle: "user_message", type: "animatedEdge", animated: true },
  { id: "sb_e8", source: "sb_txt50", target: "sb_llm50", sourceHandle: "output", targetHandle: "user_message", type: "animatedEdge", animated: true },
  { id: "sb_e9", source: "sb_txt90", target: "sb_llm90", sourceHandle: "output", targetHandle: "user_message", type: "animatedEdge", animated: true },
];
