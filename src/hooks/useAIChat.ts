import { useState, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/lib/auth-token";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface UseAIChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useAIChat = (): UseAIChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      setError(null);

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: trimmed,
      };

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Build API messages array from full conversation history + the new user message
      const apiMessages = [
        ...messages.map(({ role, content: c }) => ({ role, content: c })),
        { role: userMessage.role, content: userMessage.content },
      ];

      setIsStreaming(true);
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetchWithAuth("ai-chat", {
          messages: apiMessages,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          throw new Error(
            `Chat request failed (${response.status}): ${errorText}`,
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response stream available");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from the buffer
          const lines = buffer.split("\n");
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data: ")) continue;

            const data = trimmedLine.slice(6); // Remove "data: " prefix
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (
                parsed.type === "content_block_delta" &&
                parsed.delta?.text
              ) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + parsed.delta.text,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);

        // Remove the empty assistant message on error
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant" && last.content === "") {
            updated.pop();
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [isStreaming, messages],
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setIsStreaming(false);
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { messages, isStreaming, error, sendMessage, clearChat };
};
