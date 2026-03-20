"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { type NodeProps } from "@xyflow/react";
import { ImagePlus, Upload, X, Loader2, AlertCircle } from "lucide-react";
import NodeWrapper from "./NodeWrapper";
import { NODE_TYPES, type UploadImageNodeData } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflow-store";
import { useFileUpload } from "@/lib/hooks/use-file-upload";

const ACCEPTED_IMAGE_TYPES = ".jpg,.jpeg,.png,.webp,.gif";

export default function UploadImageNode({ id, data }: NodeProps) {
  const nodeData = data as UploadImageNodeData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Local preview state — blob URLs live here only, never persisted to DB
  const savedUrl = nodeData.imageUrl?.startsWith("blob:") ? null : (nodeData.imageUrl || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(savedUrl);

  // On mount: clear any stale blob URLs left over in DB from previous sessions
  useEffect(() => {
    if (nodeData.imageUrl?.startsWith("blob:") || nodeData.output?.startsWith("blob:")) {
      updateNodeData(id, { imageUrl: undefined, output: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { upload, isUploading, progress } = useFileUpload({
    fileType: "image",
    onSuccess: (result) => {
      updateNodeData(id, {
        imageUrl: result.url,
        fileName: result.fileName,
        output: result.url,
      });
      setPreviewUrl(result.url);
      setUploadError(null);
    },
    onError: (error) => {
      setPreviewUrl(null);
      setUploadError(error);
      // Clear any stale URLs so they don't get saved to DB
      updateNodeData(id, { imageUrl: undefined, output: undefined, fileName: undefined });
    },
  });

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 50 * 1024 * 1024) {
        setUploadError("File too large. Maximum size is 50MB.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setUploadError(null);

      // Show blob URL as preview locally — NOT saved to DB
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      updateNodeData(id, { fileName: file.name });

      try {
        await upload(file);
      } catch {
        setPreviewUrl(null);
        updateNodeData(id, { imageUrl: undefined, output: undefined, fileName: undefined });
      }
    },
    [id, updateNodeData, upload]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      if (file.size > 50 * 1024 * 1024) {
        setUploadError("File too large. Maximum size is 50MB.");
        return;
      }
      setUploadError(null);
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      updateNodeData(id, { fileName: file.name });
      try {
        await upload(file);
      } catch {
        setPreviewUrl(null);
        updateNodeData(id, { imageUrl: undefined, output: undefined, fileName: undefined });
      }
    },
    [id, updateNodeData, upload]
  );

  const clearImage = useCallback(() => {
    updateNodeData(id, { imageUrl: undefined, fileName: undefined, output: undefined });
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [id, updateNodeData]);

  return (
    <NodeWrapper
      id={id}
      type={NODE_TYPES.UPLOAD_IMAGE}
      label="Upload Image"
      icon={<ImagePlus size={14} />}
      color="#22c55e"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt={nodeData.fileName || "Uploaded"}
            className="w-full h-32 object-cover rounded-lg border border-[#2a2a2e]"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex flex-col items-center justify-center">
              <Loader2 size={20} className="text-green-400 animate-spin" />
              <div className="w-3/4 h-1 bg-[#2a2a2e] rounded-full mt-2">
                <div
                  className="h-full bg-green-400 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={clearImage}
            className="absolute top-1 right-1 bg-black/70 rounded-full p-1 hover:bg-red-500/80 transition-colors"
          >
            <X size={12} />
          </button>
          <p className="text-[10px] text-[#71717a] mt-1 truncate">
            {nodeData.fileName}
          </p>
        </div>
      ) : (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`nodrag w-full h-24 border-2 border-dashed rounded-lg
              flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer
              ${isDragging
                ? "border-green-500/70 text-green-400 bg-green-500/5"
                : "border-[#2a2a2e] text-[#52525b] hover:border-green-500/40 hover:text-green-400/60"
              }`}
          >
            <Upload size={20} />
            <span className="text-xs">Click or drag to upload</span>
            <span className="text-[10px]">JPG, PNG, WebP, GIF</span>
          </div>
          {uploadError && (
            <div className="flex items-center gap-1 mt-1 text-red-400">
              <AlertCircle size={11} />
              <span className="text-[10px] leading-tight">{uploadError}</span>
            </div>
          )}
        </>
      )}
    </NodeWrapper>
  );
}
