import Groq from "groq-sdk";
import { resolveImageUrls } from "@/lib/resolve-url";

interface GroqRequest {
  model: string;
  systemPrompt: string;
  userMessage: string;
  imageUrls?: string[];
  apiKey: string;
}

/**
 * Calls Groq API with text and optional images.
 * Images are resolved from local paths to base64 data URIs automatically.
 */
export async function runGroq({
  model,
  systemPrompt,
  userMessage,
  imageUrls = [],
  apiKey,
}: GroqRequest): Promise<string> {
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured. Add it to your .env.local file.");
  }

  const groq = new Groq({ apiKey });

  const messages: any[] = [];
  
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  // Resolve local paths (/uploads/...) to base64 data URIs
  const resolvedUrls = await resolveImageUrls(imageUrls);

  if (resolvedUrls.length > 0) {
    const content: any[] = [{ type: "text", text: userMessage }];
    for (const url of resolvedUrls) {
      content.push({
        type: "image_url",
        image_url: { url },
      });
    }
    messages.push({ role: "user", content });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages,
      model,
      max_tokens: 2000,
    });
    
    return chatCompletion.choices[0]?.message?.content || "";
  } catch (error: any) {
    throw new Error(`Groq API error: ${error.message || "Unknown error"}`);
  }
}