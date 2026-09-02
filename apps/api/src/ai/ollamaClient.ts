const OLLAMA_URL = "http://localhost:11434/api/chat";

export interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_name?: string;
}

export interface OllamaResponse {
  message?: {
    role: string;
    content: string;
    tool_calls?: Array<{
      function: {
        name: string;
        arguments: Record<string, unknown>;
      };
    }>;
  };

  done?: boolean;
}

export async function chatWithOllama(
  messages: OllamaMessage[]
): Promise<OllamaResponse> {
  const response = await fetch(
    OLLAMA_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        model: "qwen3:4b",
        messages,
        stream: false,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Ollama request failed (${response.status})`
    );
  }

  return (await response.json()) as OllamaResponse;
}