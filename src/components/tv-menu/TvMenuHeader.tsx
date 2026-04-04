import { useEffect, useState } from "react";

interface Props {
  text: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
}

export function TvMenuHeader({ text, accentColor, textColor, backgroundColor }: Props) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours();
  const minutes = String(time.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return (
    <div className="relative shrink-0 overflow-hidden">
      <style>{`
        @keyframes headerAccentPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes headerGlowBreath {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.12; }
        }
      `}</style>

      {/* Subtle gradient background for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${accentColor}08 0%, transparent 100%)`,
          animation: "headerGlowBreath 8s ease-in-out infinite",
        }}
      />

      {/* Main header row */}
      <div className="relative flex items-center justify-between px-10 py-5 gap-6">

        {/* Left: decorative ornament */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="flex flex-col gap-1">
            <div
              className="w-14 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${accentColor}60)`,
              }}
            />
            <div
              className="w-8 h-px ml-auto"
              style={{
                background: `linear-gradient(90deg, transparent, ${accentColor}30)`,
              }}
            />
          </div>
          <div
            className="w-1.5 h-1.5 rotate-45"
            style={{ backgroundColor: `${accentColor}55` }}
          />
          <div
            className="w-1 h-1 rotate-45"
            style={{ backgroundColor: `${accentColor}30` }}
          />
        </div>

        {/* Center: restaurant name / menu title */}
        <div className="flex-1 flex justify-center">
          <h1
            className="font-serif font-bold text-center tracking-widest"
            style={{
              color: accentColor,
              fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)",
              lineHeight: 1.1,
              textShadow: `0 0 50px ${accentColor}45, 0 0 100px ${accentColor}15`,
              letterSpacing: "0.12em",
            }}
          >
            {text || "Our Menu"}
          </h1>
        </div>

        {/* Right: live clock */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div
            className="w-1 h-1 rotate-45"
            style={{ backgroundColor: `${accentColor}30` }}
          />
          <div
            className="w-1.5 h-1.5 rotate-45"
            style={{ backgroundColor: `${accentColor}55` }}
          />
          <div className="flex flex-col gap-1">
            <div
              className="w-14 h-px"
              style={{
                background: `linear-gradient(90deg, ${accentColor}60, transparent)`,
              }}
            />
            <div
              className="w-8 h-px"
              style={{
                background: `linear-gradient(90deg, ${accentColor}30, transparent)`,
              }}
            />
          </div>
          {/* Clock block */}
          <div
            className="ml-1 flex items-baseline gap-1 px-3 py-1.5 rounded-xl"
            style={{
              backgroundColor: `${accentColor}0C`,
              border: `1px solid ${accentColor}18`,
              boxShadow: `inset 0 1px 0 ${accentColor}10`,
            }}
          >
            <span
              className="font-mono font-semibold tabular-nums"
              style={{
                color: `${textColor}90`,
                fontSize: "1rem",
                letterSpacing: "0.04em",
              }}
            >
              {displayHour}:{minutes}
            </span>
            <span
              className="font-mono font-medium"
              style={{
                color: `${textColor}45`,
                fontSize: "0.6rem",
                letterSpacing: "0.08em",
              }}
            >
              {ampm}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom separator — tapered glow line */}
      <div className="relative mx-6 mb-0">
        <div
          className="h-px"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}30 15%, ${accentColor}80 40%, ${accentColor} 50%, ${accentColor}80 60%, ${accentColor}30 85%, transparent 100%)`,
            animation: "headerAccentPulse 5s ease-in-out infinite",
          }}
        />
        <div
          className="h-px mt-px"
          style={{
            background: `linear-gradient(90deg, transparent 10%, ${accentColor}14 30%, ${accentColor}35 50%, ${accentColor}14 70%, transparent 90%)`,
          }}
        />
      </div>
    </div>
  );
}
