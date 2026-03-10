import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { AIChatPanel } from "./AIChatPanel";

export const AIChatBubble = () => {
  const { isLoaded, isSignedIn } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  if (!isLoaded || !isSignedIn) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {isOpen && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
          <AIChatPanel onClose={() => setIsOpen(false)} />
        </div>
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-food-red to-food-orange text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
        aria-label={isOpen ? "Close AI chat" : "Open AI chat"}
      >
        <MessageCircle
          className="absolute transition-transform duration-200"
          style={{ transform: isOpen ? "scale(0)" : "scale(1)" }}
          size={24}
        />
        <span
          className="absolute text-2xl font-light transition-transform duration-200"
          style={{ transform: isOpen ? "scale(1)" : "scale(0)" }}
          aria-hidden="true"
        >
          &times;
        </span>
      </button>
    </div>
  );
};
