import { type Node, type Edge } from "@xyflow/react";

// ============================================================
// Handle data types — used for type-safe connections
// Color-coded on the canvas: purple=text, green=image, blue=video, yellow=number
// ============================================================
export enum HandleDataType {
  TEXT = "text",
  IMAGE_URL = "image_url",
  VIDEO_URL = "video_url",
  NUMBER = "number",
}

// ============================================================
// Node type identifiers — these map to React Flow node types
// ============================================================
export const NODE_TYPES = {
  TEXT: "textNode",
  UPLOAD_IMAGE: "uploadImageNode",
  UPLOAD_VIDEO: "uploadVideoNode",
  LLM: "llmNode",
  CROP_IMAGE: "cropImageNode",
  EXTRACT_FRAME: "extractFrameNode",
} as const;

export type NodeTypeKey = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

// ============================================================
// Per-node data shapes — what data each node stores
// ============================================================
export interface TextNodeData extends Record<string, unknown> {
  label: string;
  text: string;
  output?: string;
}

export interface UploadImageNodeData extends Record<string, unknown> {
  label: string;
  imageUrl?: string;
  fileName?: string;
  output?: string;
}

export interface UploadVideoNodeData extends Record<string, unknown> {
  label: string;
  videoUrl?: string;
  fileName?: string;
  output?: string;
}

export interface LLMNodeData extends Record<string, unknown> {
  label: string;
  model: string;
  systemPrompt?: string;
  userMessage?: string;
  imageUrls?: string[];
  temperature?: number;
  maxTokens?: number;
  output?: string;
  isRunning?: boolean;
  error?: string;
}

export interface CropImageNodeData extends Record<string, unknown> {
  label: string;
  imageUrl?: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  output?: string;
  isRunning?: boolean;
  error?: string;
}

export interface ExtractFrameNodeData extends Record<string, unknown> {
  label: string;
  videoUrl?: string;
  timestamp: string;
  output?: string;
  isRunning?: boolean;
  error?: string;
}

// Union of all node data types
export type WorkflowNodeData =
  | TextNodeData
  | UploadImageNodeData
  | UploadVideoNodeData
  | LLMNodeData
  | CropImageNodeData
  | ExtractFrameNodeData;

// Typed React Flow node
export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

// ============================================================
// Node metadata — for sidebar display and defaults
// ============================================================
export interface NodeMeta {
  type: NodeTypeKey;
  label: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // handle/accent color
  defaultData: WorkflowNodeData;
}

export const NODE_META: Record<NodeTypeKey, NodeMeta> = {
  [NODE_TYPES.TEXT]: {
    type: NODE_TYPES.TEXT,
    label: "Text",
    description: "Static text input",
    icon: "Type",
    color: "#8b5cf6",
    defaultData: { label: "Text", text: "" },
  },
  [NODE_TYPES.UPLOAD_IMAGE]: {
    type: NODE_TYPES.UPLOAD_IMAGE,
    label: "Upload Image",
    description: "Upload an image file",
    icon: "ImagePlus",
    color: "#059669",
    defaultData: { label: "Upload Image" },
  },
  [NODE_TYPES.UPLOAD_VIDEO]: {
    type: NODE_TYPES.UPLOAD_VIDEO,
    label: "Upload Video",
    description: "Upload a video file",
    icon: "Film",
    color: "#2563eb",
    defaultData: { label: "Upload Video" },
  },
  [NODE_TYPES.LLM]: {
    type: NODE_TYPES.LLM,
    label: "Run LLM",
    description: "Run any LLM model",
    icon: "Bot",
    color: "#7c3aed",
    defaultData: { label: "Run LLM", model: "groq:meta-llama/llama-4-scout-17b-16e-instruct", temperature: 0.7, maxTokens: 1024 },
  },
  [NODE_TYPES.CROP_IMAGE]: {
    type: NODE_TYPES.CROP_IMAGE,
    label: "Crop Image",
    description: "Crop an image",
    icon: "Crop",
    color: "#059669",
    defaultData: {
      label: "Crop Image",
      xPercent: 0,
      yPercent: 0,
      widthPercent: 100,
      heightPercent: 100,
    },
  },
  [NODE_TYPES.EXTRACT_FRAME]: {
    type: NODE_TYPES.EXTRACT_FRAME,
    label: "Extract Frame",
    description: "Extract frame from video",
    icon: "Clapperboard",
    color: "#3b82f6",
    defaultData: { label: "Extract Frame", timestamp: "0" },
  },
};

// ============================================================
// Handle definitions — what inputs/outputs each node has
// ============================================================
export interface HandleDef {
  id: string;
  label: string;
  dataType: HandleDataType;
  required?: boolean;
}

export const NODE_INPUTS: Record<NodeTypeKey, HandleDef[]> = {
  [NODE_TYPES.TEXT]: [],
  [NODE_TYPES.UPLOAD_IMAGE]: [],
  [NODE_TYPES.UPLOAD_VIDEO]: [],
  [NODE_TYPES.LLM]: [
    { id: "system_prompt", label: "System Prompt", dataType: HandleDataType.TEXT },
    { id: "user_message", label: "User Message", dataType: HandleDataType.TEXT, required: true },
    { id: "images", label: "Images", dataType: HandleDataType.IMAGE_URL },
  ],
  [NODE_TYPES.CROP_IMAGE]: [
    { id: "image_url", label: "Image", dataType: HandleDataType.IMAGE_URL, required: true },
    { id: "x_percent", label: "X %", dataType: HandleDataType.NUMBER },
    { id: "y_percent", label: "Y %", dataType: HandleDataType.NUMBER },
    { id: "width_percent", label: "Width %", dataType: HandleDataType.NUMBER },
    { id: "height_percent", label: "Height %", dataType: HandleDataType.NUMBER },
  ],
  [NODE_TYPES.EXTRACT_FRAME]: [
    { id: "video_url", label: "Video", dataType: HandleDataType.VIDEO_URL, required: true },
    { id: "timestamp", label: "Timestamp", dataType: HandleDataType.TEXT },
  ],
};

export const NODE_OUTPUTS: Record<NodeTypeKey, HandleDef[]> = {
  [NODE_TYPES.TEXT]: [
    { id: "output", label: "Text", dataType: HandleDataType.TEXT },
  ],
  [NODE_TYPES.UPLOAD_IMAGE]: [
    { id: "output", label: "Image URL", dataType: HandleDataType.IMAGE_URL },
  ],
  [NODE_TYPES.UPLOAD_VIDEO]: [
    { id: "output", label: "Video URL", dataType: HandleDataType.VIDEO_URL },
  ],
  [NODE_TYPES.LLM]: [
    { id: "output", label: "Response", dataType: HandleDataType.TEXT },
  ],
  [NODE_TYPES.CROP_IMAGE]: [
    { id: "output", label: "Cropped Image", dataType: HandleDataType.IMAGE_URL },
  ],
  [NODE_TYPES.EXTRACT_FRAME]: [
    { id: "output", label: "Frame Image", dataType: HandleDataType.IMAGE_URL },
  ],
};

// ============================================================
// Handle color map — for visual type coding
// ============================================================
export const HANDLE_COLORS: Record<HandleDataType, string> = {
  [HandleDataType.TEXT]: "#7c3aed",      // deeper purple
  [HandleDataType.IMAGE_URL]: "#059669", // deeper green
  [HandleDataType.VIDEO_URL]: "#2563eb", // deeper blue
  [HandleDataType.NUMBER]: "#d97706",    // deeper yellow (amber)
};
