import { resolveImageUrls } from "@/lib/resolve-url";

interface OpenRouterRequest {
  model?: string;
  systemPrompt: string;
  userMessage: string;
  imageUrls: string[];
  apiKey: string;
}

export async function runOpenRouter({
  model,
  systemPrompt,
  userMessage,
  imageUrls,
  apiKey,
}: OpenRouterRequest): Promise<string> {
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured. Add it to your .env.local file.");
  }

  // Resolve local paths (/uploads/...) to base64 data URIs
  const resolvedUrls = await resolveImageUrls(imageUrls || []);
  const hasImages = resolvedUrls.length > 0;

  // Build messages
  const messages: any[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  if (hasImages) {
    const contentParts: any[] = [{ type: "text", text: userMessage }];
    for (const url of resolvedUrls) {
      contentParts.push({
        type: "image_url",
        image_url: { url },
      });
    }
    messages.push({ role: "user", content: contentParts });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  // Default model selection
  const selectedModel = model || (hasImages
    ? "qwen/qwen2.5-vl-72b-instruct:free"
    : "meta-llama/llama-3.3-70b-instruct:free");
  if (!selectedModel) throw new Error("No model specified for OpenRouter.");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "NextFlow",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errMsg = err?.error?.message || response.statusText;

      if (response.status === 429) {
        throw new Error(`OpenRouter rate limit hit. ${errMsg}`);
      }
      if (response.status === 401) {
        throw new Error("Invalid OpenRouter API key.");
      }
      throw new Error(`OpenRouter API error ${response.status}: ${errMsg}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("OpenRouter returned an empty response.");
    }

    return text;
  } catch (error: any) {
    if (error.message?.startsWith("OpenRouter")) throw error;
    throw new Error(`OpenRouter request failed: ${error.message || "Unknown error"}`);
  }
}