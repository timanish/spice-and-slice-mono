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

  const hours = time.getHours() % 12 || 12;
  const minutes = String(time.getMinutes()).padStart(2, "0");
  const ampm = time.getHours() >= 12 ? "PM" : "AM";

  return (
    <div className="relative shrink-0 overflow-hidden">
      <style>{`
        @keyframes headerTopBarPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Top accent bar — thicker, more visible */}
      <div
        style={{
          height: "3px",
          background: `linear-gradient(90deg, transparent 0%, ${accentColor}40 10%, ${accentColor} 40%, ${accentColor} 60%, ${accentColor}40 90%, transparent 100%)`,
          animation: "headerTopBarPulse 6s ease-in-out infinite",
        }}
      />

      {/* Background gradient — gives the header visual depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          top: "3px",
          background: `linear-gradient(180deg, ${accentColor}0D 0%, transparent 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Main row */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          padding: "1.25rem 2.5rem 1.1rem",
          gap: "1.5rem",
        }}
      >
        {/* Restaurant / menu title — the hero of the header */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1
            className="font-serif font-bold"
            style={{
              color: accentColor,
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
              letterSpacing: "0.1em",
              lineHeight: 1,
              textShadow: `0 0 80px ${accentColor}40, 0 0 160px ${accentColor}15`,
            }}
          >
            {text || "Our Menu"}
          </h1>
        </div>

        {/* Live clock — right side, pinned */}
        <div
          style={{
            position: "absolute",
            right: "2.5rem",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "2px",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem" }}>
            <span
              className="font-mono font-bold tabular-nums"
              style={{
                color: `${textColor}85`,
                fontSize: "1.5rem",
                letterSpacing: "0.02em",
                lineHeight: 1,
              }}
            >
              {hours}:{minutes}
            </span>
            <span
              className="font-mono font-semibold"
              style={{
                color: `${textColor}45`,
                fontSize: "0.7rem",
                letterSpacing: "0.06em",
                lineHeight: 1,
              }}
            >
              {ampm}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom separator — a single clean rule */}
      <div
        style={{
          margin: "0 2rem",
          height: "1px",
          background: `linear-gradient(90deg, transparent 0%, ${accentColor}25 15%, ${accentColor}70 45%, ${accentColor}70 55%, ${accentColor}25 85%, transparent 100%)`,
        }}
      />
    </div>
  );
}
