import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface Props {
  text: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
}

export function TvMenuHeader({ text, accentColor, textColor, backgroundColor }: Props) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relative shrink-0 overflow-hidden">
      {/* Animated gradient top bar */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accentColor}40 20%, ${accentColor} 50%, ${accentColor}40 80%, transparent 100%)`,
          animation: "headerShimmer 4s ease-in-out infinite",
        }}
      />

      <style>{`
        @keyframes headerShimmer {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes headerGlow {
          0%, 100% { opacity: 0.08; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.05); }
        }
      `}</style>

      <div className="relative flex items-center justify-between px-10 py-5">
        {/* Ambient glow behind title */}
        <div
          className="absolute inset-0 blur-[80px]"
          style={{
            background: `radial-gradient(ellipse 60% 100% at center, ${accentColor}, transparent 70%)`,
            animation: "headerGlow 6s ease-in-out infinite",
          }}
        />

        {/* Left ornament — decorative line + diamond cluster */}
        <div className="hidden md:flex items-center gap-3 z-10">
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rotate-45"
              style={{ backgroundColor: `${accentColor}30` }}
            />
            <div
              className="w-2 h-2 rotate-45"
              style={{ backgroundColor: `${accentColor}60` }}
            />
            <div
              className="w-1.5 h-1.5 rotate-45"
              style={{ backgroundColor: `${accentColor}30` }}
            />
          </div>
          <div
            className="w-24 h-px"
            style={{
              background: `linear-gradient(90deg, ${accentColor}60, transparent)`,
            }}
          />
        </div>

        {/* Center title */}
        <div className="flex items-center gap-3 z-10 mx-auto">
          <Sparkles
            className="w-5 h-5 hidden md:block"
            style={{
              color: `${accentColor}80`,
              filter: `drop-shadow(0 0 6px ${accentColor}40)`,
            }}
          />
          <h1
            className="text-4xl font-serif font-bold text-center tracking-wider relative"
            style={{
              color: accentColor,
              textShadow: `0 0 60px ${accentColor}50, 0 0 120px ${accentColor}20, 0 2px 4px ${backgroundColor}90`,
              letterSpacing: "0.08em",
            }}
          >
            {text || "Our Menu"}
          </h1>
          <Sparkles
            className="w-5 h-5 hidden md:block"
            style={{
              color: `${accentColor}80`,
              filter: `drop-shadow(0 0 6px ${accentColor}40)`,
            }}
          />
        </div>

        {/* Right ornament — time + decorative line + diamond cluster */}
        <div className="hidden md:flex items-center gap-3 z-10">
          <div
            className="w-24 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}60)`,
            }}
          />
          <div
            className="px-3 py-1 rounded-full font-mono tracking-widest"
            style={{
              fontSize: "0.85rem",
              color: `${textColor}90`,
              backgroundColor: `${accentColor}10`,
              border: `1px solid ${accentColor}20`,
              textShadow: `0 0 20px ${accentColor}30`,
            }}
          >
            {formattedTime}
          </div>
        </div>
      </div>

      {/* Bottom decorative double-line */}
      <div className="mx-8 flex flex-col gap-px">
        <div
          className="h-px"
          style={{
            background: `linear-gradient(90deg, transparent 5%, ${accentColor}50 30%, ${accentColor}80 50%, ${accentColor}50 70%, transparent 95%)`,
          }}
        />
        <div
          className="h-px"
          style={{
            background: `linear-gradient(90deg, transparent 15%, ${accentColor}25 35%, ${accentColor}40 50%, ${accentColor}25 65%, transparent 85%)`,
          }}
        />
      </div>
    </div>
  );
}
