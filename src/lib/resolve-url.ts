/**
 * Resolves image URLs for LLM API consumption.
 * 
 * Problem: Upload nodes produce local paths like "/uploads/crop_abc.jpg"
 * but LLM APIs (Groq, OpenRouter, Gemini) need either:
 *   - Full HTTP URLs (https://...)  
 *   - Base64 data URIs (data:image/jpeg;base64,...)
 * 
 * This utility converts local paths to base64 data URIs so they work
 * regardless of whether the server is localhost or deployed.
 */

import { readFile } from "fs/promises";
import { join } from "path";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Takes an image URL (local path or HTTP) and returns a format
 * that LLM APIs can consume — either a data URI or the original HTTP URL.
 */
export async function resolveImageUrl(url: string): Promise<string | null> {
  if (!url || typeof url !== "string") return null;

  // Already a data URI — pass through
  if (url.startsWith("data:")) return url;

  // Blob URLs are browser-only and cannot be fetched server-side — skip
  if (url.startsWith("blob:")) {
    console.warn(`[resolveImageUrl] Blob URL cannot be used server-side (upload incomplete?): ${url}`);
    return null;
  }

  // Full HTTP URL — pass through (remote APIs can fetch these)
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  // Local path like "/uploads/crop_abc.jpg" — convert to base64 data URI
  if (url.startsWith("/uploads/") || url.startsWith("/uploads\\")) {
    try {
      const filePath = join(process.cwd(), "public", url);
      const buffer = await readFile(filePath);
      const ext = url.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = MIME_TYPES[ext] || "image/jpeg";
      const base64 = buffer.toString("base64");
      return `data:${mimeType};base64,${base64}`;
    } catch (err) {
      console.warn(`[resolveImageUrl] Failed to read local file: ${url}`, err);
      return null;
    }
  }

  // Unknown format — skip
  console.warn(`[resolveImageUrl] Unrecognized URL format: ${url}`);
  return null;
}

/**
 * Resolves an array of image URLs, filtering out any that fail.
 */
export async function resolveImageUrls(urls: string[]): Promise<string[]> {
  const results = await Promise.all(urls.map(resolveImageUrl));
  return results.filter((u): u is string => u !== null);
}