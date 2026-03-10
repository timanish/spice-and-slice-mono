import { useState, useRef, useEffect } from "react";
import { X, Send, Trash2, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIChat } from "@/hooks/useAIChat";
import type { ChatMessage } from "@/hooks/useAIChat";

interface AIChatPanelProps {
  onClose: () => void;
}

export const AIChatPanel = ({ onClose }: AIChatPanelProps) => {
  const { messages, isStreaming, error, sendMessage, clearChat } = useAIChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col w-[360px] sm:w-[400px] h-[500px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-food-red to-food-orange text-white shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">Spice&Slice Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={clearChat}
              aria-label="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-food-red to-food-orange flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <p className="font-semibold text-gray-800">
              Hi! I'm your Spice&Slice assistant.
            </p>
            <p className="text-sm text-gray-500">
              Ask me about our menu, place orders, or get recommendations!
            </p>
          </div>
        )}

        {messages.map((message: ChatMessage) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {error && (
          <div className="flex justify-center">
            <span className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-full">
              {error}
            </span>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-3 flex items-end gap-2 shrink-0">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={isStreaming}
          className="flex-1 resize-none max-h-20 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-food-orange focus:border-transparent placeholder-gray-400 disabled:opacity-50"
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl bg-food-red hover:bg-food-red/90 text-white"
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          aria-label="Send message"
        >
          {isStreaming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

/* ---- Message Bubble Sub-component ---- */

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-food-red text-white text-sm px-4 py-2 rounded-2xl rounded-br-md whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  const isEmpty = message.content === "";

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] bg-gray-100 text-gray-800 text-sm px-4 py-2 rounded-2xl rounded-bl-md whitespace-pre-wrap">
        {isEmpty ? (
          <span className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking...
          </span>
        ) : (
          message.content
        )}
      </div>
    </div>
  );
};
