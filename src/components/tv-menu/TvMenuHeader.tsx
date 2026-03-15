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
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relative shrink-0 overflow-hidden">
      {/* Decorative gradient bar */}
      <div
        className="h-1.5"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />

      <div className="relative flex items-center justify-center px-10 py-3">
        {/* Subtle glow behind title */}
        <div
          className="absolute inset-0 opacity-10 blur-3xl"
          style={{
            background: `radial-gradient(ellipse at center, ${accentColor}, transparent 70%)`,
          }}
        />

        {/* Decorative left ornament */}
        <div className="hidden md:flex items-center gap-2 absolute left-10">
          <div
            className="w-16 h-px"
            style={{ backgroundColor: `${accentColor}40` }}
          />
          <div
            className="w-2 h-2 rotate-45"
            style={{ backgroundColor: `${accentColor}60` }}
          />
        </div>

        <h1
          className="text-3xl font-serif font-bold text-center tracking-wide relative"
          style={{
            color: accentColor,
            textShadow: `0 0 40px ${accentColor}30, 0 2px 4px ${backgroundColor}80`,
          }}
        >
          {text || "Our Menu"}
        </h1>

        {/* Decorative right ornament + time */}
        <div className="hidden md:flex items-center gap-3 absolute right-10">
          <span
            className="text-lg font-mono opacity-50 tracking-wider"
            style={{ color: textColor }}
          >
            {formattedTime}
          </span>
          <div
            className="w-2 h-2 rotate-45"
            style={{ backgroundColor: `${accentColor}60` }}
          />
          <div
            className="w-16 h-px"
            style={{ backgroundColor: `${accentColor}40` }}
          />
        </div>
      </div>

      {/* Bottom decorative line */}
      <div
        className="h-px mx-10"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}50, transparent)`,
        }}
      />
    </div>
  );
}
