import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveImageUrls } from "@/lib/resolve-url";

interface GeminiRequest {
  model: string;
  systemPrompt: string;
  userMessage: string;
  imageUrls: string[];
  apiKey: string;
}

/**
 * Calls Google Gemini API with text and optional images.
 * Images are resolved from local paths to base64 data URIs automatically.
 */
export async function runGemini({
  model,
  systemPrompt,
  userMessage,
  imageUrls,
  apiKey,
}: GeminiRequest): Promise<string> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured. Add it to your .env.local file.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const genModel = genAI.getGenerativeModel({
    model,
    ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
  });

  // Build content parts
  const parts: any[] = [{ text: userMessage }];

  // Resolve local paths to base64, keep HTTP URLs as-is
  const resolvedUrls = await resolveImageUrls(imageUrls || []);

  for (const url of resolvedUrls) {
    if (url.startsWith("data:")) {
      // data URI — extract mime and base64
      const match = url.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    } else if (url.startsWith("http")) {
      // HTTP URL — fetch and convert to base64 for Gemini
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = response.headers.get("content-type") || "image/jpeg";
        parts.push({
          inlineData: { mimeType, data: base64 },
        });
      } catch (err) {
        console.warn(`Failed to fetch image ${url}:`, err);
      }
    }
  }

  try {
    const result = await genModel.generateContent(parts);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    return text;
  } catch (error: any) {
    if (error.message?.includes("SAFETY")) {
      throw new Error("Content blocked by Gemini safety filters.");
    }
    if (error.message?.includes("quota")) {
      throw new Error("Gemini API quota exceeded.");
    }
    if (error.message?.includes("API_KEY")) {
      throw new Error("Invalid Gemini API key.");
    }
    throw new Error(`Gemini API error: ${error.message || "Unknown error"}`);
  }
}