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

      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 2, 85));
      }, 400);

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

          // Poll with short intervals early on, backing off for larger files
          // 500ms × 10 → 1000ms × 10 → 2000ms until done (max ~8 min total)
          let attempts = 0;
          const pollIntervals = [
            ...Array(10).fill(500),   // first 5s: check every 500ms
            ...Array(10).fill(1000),  // next 10s: check every 1s
          ];

          while (
            assembly.ok !== "ASSEMBLY_COMPLETED" &&
            assembly.ok !== "REQUEST_ABORTED" &&
            !assembly.error &&
            attempts < 300
          ) {
            const delay = pollIntervals[attempts] ?? 2000;
            await new Promise((r) => setTimeout(r, delay));
            const pollRes = await fetch(assembly.assembly_ssl_url);
            assembly = await pollRes.json();
            attempts++;
          }

          if (assembly.ok !== "ASSEMBLY_COMPLETED") {
            throw new Error(assembly.error || "Upload timed out — file may be too large or connection too slow");
          }

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
