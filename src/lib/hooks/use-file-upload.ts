"use client";

import { useState, useCallback } from "react";

interface UploadResult {
  url: string;
  fileName: string;
  size: number;
  type: string;
}

interface UseFileUploadOptions {
  fileType: "image" | "video";
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export function useFileUpload({ fileType, onSuccess, onError }: UseFileUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setProgress(0);

      // Slow steady progress — large files can take minutes, don't rush to 90% in 2s
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 1, 85));
      }, 800);

      try {
        let url: string;

        // Try Transloadit — browser uploads directly to their CDN (no file size limit from our server)
        const tokenRes = await fetch("/api/upload/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (tokenRes.ok) {
          const { params, signature } = await tokenRes.json();

          // POST file directly to Transloadit — browser → Transloadit CDN
          const formData = new FormData();
          formData.append("params", params);
          formData.append("signature", `sha384:${signature}`);
          formData.append("file", file);

          const uploadRes = await fetch("https://api2.transloadit.com/assemblies", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) throw new Error("Transloadit upload failed");

          let assembly = await uploadRes.json();

          // Poll until assembly completes (max 240 attempts × 2s = ~8 minutes for large files)
          let attempts = 0;
          while (
            assembly.ok !== "ASSEMBLY_COMPLETED" &&
            assembly.ok !== "REQUEST_ABORTED" &&
            !assembly.error &&
            attempts < 240
          ) {
            await new Promise((r) => setTimeout(r, 2000));
            const pollRes = await fetch(assembly.assembly_ssl_url);
            assembly = await pollRes.json();
            attempts++;
          }

          if (assembly.ok !== "ASSEMBLY_COMPLETED") {
            throw new Error(assembly.error || "Upload timed out — file may be too large or connection too slow");
          }

          // results[":original"] is populated when the step is explicitly defined;
          // fall back to assembly.uploads which always contains all uploaded files
          const fileResult =
            assembly.results?.[":original"]?.[0] ??
            assembly.uploads?.[0];

          if (!fileResult?.ssl_url) {
            throw new Error(`Upload completed but no CDN URL found (assembly: ${assembly.assembly_id})`);
          }

          url = fileResult.ssl_url;
        } else {
          // Local dev fallback — upload via API route to /public/uploads/
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch(`/api/upload?mode=direct&type=${fileType}`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Upload failed");
          }
          const result = await res.json();
          url = result.url;
        }

        clearInterval(progressInterval);
        setProgress(100);

        onSuccess?.({ url, fileName: file.name, size: file.size, type: file.type });
        return { url, fileName: file.name, size: file.size, type: file.type };
      } catch (error: any) {
        clearInterval(progressInterval);
        const message = error.message || "Upload failed";
        onError?.(message);
        throw error;
      } finally {
        setIsUploading(false);
        setTimeout(() => setProgress(0), 500);
      }
    },
    [fileType, onSuccess, onError]
  );

  return { upload, isUploading, progress };
}
