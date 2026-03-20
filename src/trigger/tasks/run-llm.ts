import { task } from "@trigger.dev/sdk/v3";

export const runLLMTask = task({
  id: "run-llm",
  maxDuration: 120,
  retry: { maxAttempts: 2 },
  run: async (payload: {
    provider: "groq" | "openrouter";
    model: string;
    systemPrompt: string;
    userMessage: string;
    imageUrls: string[]; // HTTPS URLs or data URIs
    apiKey: string;
    temperature?: number;
    maxTokens?: number;
  }) => {
    const { provider, model, systemPrompt, userMessage, imageUrls, apiKey, temperature = 0.7, maxTokens = 1024 } = payload;

    if (!apiKey) throw new Error(`${provider} API key not configured.`);
    if (!userMessage) throw new Error("User message is required.");

    const messages: any[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });

    // Build user message — attach images if provided
    if (imageUrls.length > 0) {
      const content: any[] = [{ type: "text", text: userMessage }];
      for (const url of imageUrls) {
        if (!url) continue;
        if (url.startsWith("data:")) {
          // Already a base64 data URI — pass as inline base64
          content.push({ type: "image_url", image_url: { url } });
        } else if (url.startsWith("https://") || url.startsWith("http://")) {
          // Public URL — pass directly, the LLM API fetches it on their end
          // (avoids fetch in the worker which can fail due to network restrictions)
          content.push({ type: "image_url", image_url: { url } });
        }
      }
      messages.push({ role: "user", content });
    } else {
      messages.push({ role: "user", content: userMessage });
    }

    if (provider === "groq") {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Groq API error: ${err?.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return { output: data.choices?.[0]?.message?.content || "" };
    }

    if (provider === "openrouter") {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://nextflow-eta.vercel.app",
          "X-Title": "NextFlow",
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error ${response.status}: ${err?.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return { output: data.choices?.[0]?.message?.content || "" };
    }

    throw new Error(`Unknown provider: ${provider}`);
  },
});
