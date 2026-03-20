"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { type NodeProps } from "@xyflow/react";
import { Film, Upload, X, Loader2, AlertCircle } from "lucide-react";
import NodeWrapper from "./NodeWrapper";
import { NODE_TYPES, type UploadVideoNodeData } from "@/types/nodes";
import { useWorkflowStore } from "@/store/workflow-store";
import { useFileUpload } from "@/lib/hooks/use-file-upload";

const ACCEPTED_VIDEO_TYPES = ".mp4,.mov,.webm,.m4v";

export default function UploadVideoNode({ id, data }: NodeProps) {
  const nodeData = data as UploadVideoNodeData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Local preview state — blob URLs live here only, never persisted to DB
  const savedUrl = nodeData.videoUrl?.startsWith("blob:") ? null : (nodeData.videoUrl || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(savedUrl);

  // On mount: clear any stale blob URLs left over in DB from previous sessions
  useEffect(() => {
    if (nodeData.videoUrl?.startsWith("blob:") || nodeData.output?.startsWith("blob:")) {
      updateNodeData(id, { videoUrl: undefined, output: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { upload, isUploading, progress } = useFileUpload({
    fileType: "video",
    onSuccess: (result) => {
      updateNodeData(id, {
        videoUrl: result.url,
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
      updateNodeData(id, { videoUrl: undefined, output: undefined, fileName: undefined });
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
        updateNodeData(id, { videoUrl: undefined, output: undefined, fileName: undefined });
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
      if (!file || !file.type.startsWith("video/")) return;
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
        updateNodeData(id, { videoUrl: undefined, output: undefined, fileName: undefined });
      }
    },
    [id, updateNodeData, upload]
  );

  const clearVideo = useCallback(() => {
    updateNodeData(id, { videoUrl: undefined, fileName: undefined, output: undefined });
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [id, updateNodeData]);

  return (
    <NodeWrapper
      id={id}
      type={NODE_TYPES.UPLOAD_VIDEO}
      label="Upload Video"
      icon={<Film size={14} />}
      color="#3b82f6"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_VIDEO_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative">
          <video
            src={previewUrl}
            controls
            className="w-full h-32 rounded-lg border border-[#2a2a2e] bg-black object-contain"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex flex-col items-center justify-center">
              <Loader2 size={20} className="text-blue-400 animate-spin" />
              <div className="w-3/4 h-1 bg-[#2a2a2e] rounded-full mt-2">
                <div
                  className="h-full bg-blue-400 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={clearVideo}
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
                ? "border-blue-500/70 text-blue-400 bg-blue-500/5"
                : "border-[#2a2a2e] text-[#52525b] hover:border-blue-500/40 hover:text-blue-400/60"
              }`}
          >
            <Upload size={20} />
            <span className="text-xs">Click or drag to upload</span>
            <span className="text-[10px]">MP4, MOV, WebM, M4V</span>
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
