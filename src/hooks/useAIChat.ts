import { useState, useCallback, useRef } from "react";
import { fetchWithAuth, fetchAnonymous } from "@/lib/auth-token";

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
  remainingMessages: number | null;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const ANON_MESSAGE_LIMIT = 5;
const ANON_STORAGE_KEY = "ai_chat_count";

function getAnonCount(): number {
  try {
    return parseInt(sessionStorage.getItem(ANON_STORAGE_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

function incrementAnonCount(): void {
  try {
    const count = getAnonCount();
    sessionStorage.setItem(ANON_STORAGE_KEY, String(count + 1));
  } catch {
    // sessionStorage unavailable (private browsing etc.)
  }
}

export const useAIChat = (isAuthenticated: boolean): UseAIChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to avoid stale closures in the stable sendMessage callback
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const isStreamingRef = useRef(false);
  isStreamingRef.current = isStreaming;

  // TODO: wire abort signal when fetchWithAuth supports it
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelledRef = useRef(false);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isStreamingRef.current) return;

    // Check anonymous message limit (client-side)
    if (!isAuthenticated) {
      if (getAnonCount() >= ANON_MESSAGE_LIMIT) {
        setError("signup_required");
        return;
      }
    }

    setError(null);
    cancelledRef.current = false;

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
      ...messagesRef.current.map(({ role, content: c }) => ({
        role,
        content: c,
      })),
      { role: userMessage.role, content: userMessage.content },
    ];

    setIsStreaming(true);

    try {
      const response = isAuthenticated
        ? await fetchWithAuth("ai-chat", { messages: apiMessages })
        : await fetchAnonymous("ai-chat", { messages: apiMessages });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || "Something went wrong";
        } catch {
          errorMessage = await response
            .text()
            .catch(() => "Something went wrong");
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response stream available");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        if (cancelledRef.current) break;

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

      // Increment anonymous message counter after successful response
      if (!isAuthenticated) {
        incrementAnonCount();
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
  }, [isAuthenticated]);

  const clearChat = useCallback(() => {
    cancelledRef.current = true;
    setMessages([]);
    setIsStreaming(false);
    setError(null);
  }, []);

  const remainingMessages = isAuthenticated
    ? null
    : Math.max(0, ANON_MESSAGE_LIMIT - getAnonCount());

  return { messages, isStreaming, error, sendMessage, clearChat, remainingMessages };
};
