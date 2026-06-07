import { useEffect, useState } from "react";

interface Props {
  text: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  variant?: "default" | "restaurant";
  categoryHeaderColor?: string;
  logoUrl?: string;
  logoHeight?: number;
}

// Split "Spice and Slice" / "Spice & Slice" into two halves so the restaurant
// variant can render each in a different color (red / gold).
function splitWordmark(text: string): { left: string; conj?: string; right?: string } {
  const m = text.match(/^(.+?)\s+(and|&|\+)\s+(.+)$/i);
  if (m) return { left: m[1], conj: m[2], right: m[3] };
  return { left: text };
}

export function TvMenuHeader({
  text,
  accentColor,
  textColor,
  backgroundColor,
  variant = "default",
  categoryHeaderColor,
  logoUrl,
  logoHeight,
}: Props) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours() % 12 || 12;
  const minutes = String(time.getMinutes()).padStart(2, "0");
  const ampm = time.getHours() >= 12 ? "PM" : "AM";

  if (variant === "restaurant") {
    return (
      <RestaurantHeader
        text={text}
        accentColor={accentColor}
        textColor={textColor}
        categoryHeaderColor={categoryHeaderColor ?? accentColor}
        clockLabel={`${hours}:${minutes} ${ampm}`}
        logoUrl={logoUrl}
        logoHeight={logoHeight}
      />
    );
  }

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
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={text || "Menu logo"}
              style={{
                height: logoHeight ?? 70,
                width: "auto",
                maxWidth: "70%",
                objectFit: "contain",
                display: "inline-block",
                filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
              }}
            />
          ) : (
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
          )}
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

interface RestaurantHeaderProps {
  text: string;
  accentColor: string;
  textColor: string;
  categoryHeaderColor: string;
  clockLabel: string;
  logoUrl?: string;
  logoHeight?: number;
}

function RestaurantHeader({
  text,
  accentColor,
  textColor,
  categoryHeaderColor,
  clockLabel,
  logoUrl,
  logoHeight,
}: RestaurantHeaderProps) {
  const { left, conj, right } = splitWordmark(text || "Our Menu");
  const red = "#B8001F";

  return (
    <div className="relative shrink-0 overflow-hidden" style={{ paddingTop: "0.5rem" }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.5rem 2.5rem 0.4rem",
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={text || "Menu logo"}
            style={{
              height: logoHeight ?? 110,
              width: "auto",
              maxWidth: "75%",
              objectFit: "contain",
              display: "inline-block",
              filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.55))",
            }}
          />
        ) : (
          <h1
            style={{
              fontFamily: "'Allura', cursive",
              fontSize: "clamp(2.8rem, 6vw, 4.8rem)",
              lineHeight: 1,
              letterSpacing: "0.01em",
              margin: 0,
              textShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            <span style={{ color: red }}>{left}</span>
            {right && (
              <>
                {" "}
                <span
                  className="font-serif"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontStyle: "italic",
                    fontSize: "0.45em",
                    color: `${textColor}AA`,
                    verticalAlign: "middle",
                    letterSpacing: "0.05em",
                  }}
                >
                  {conj}
                </span>{" "}
                <span style={{ color: categoryHeaderColor }}>{right}</span>
              </>
            )}
          </h1>
        )}

        {/* Clock pinned right */}
        <div
          style={{
            position: "absolute",
            right: "2rem",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <span
            className="font-mono tabular-nums"
            style={{
              color: `${textColor}70`,
              fontSize: "1.1rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            {clockLabel}
          </span>
        </div>
      </div>

      {/* Legend pill — centered under wordmark, like the reference */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingBottom: "0.5rem",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "1rem",
            padding: "0.25rem 0.85rem",
            border: `1px solid ${categoryHeaderColor}55`,
            borderRadius: "9999px",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <LegendItem
            chip={
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "0.95rem",
                  height: "0.95rem",
                  borderRadius: "50%",
                  background: "#1f7a1f",
                  border: "1.5px solid #4ade80",
                  color: "#FFFFFF",
                  fontSize: "0.5rem",
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                V
              </span>
            }
            label="Vegetarian"
            textColor={textColor}
          />
          <span style={{ color: `${textColor}40`, fontSize: "0.6rem" }}>|</span>
          <LegendItem
            chip={<span style={{ fontSize: "0.85rem", lineHeight: 1 }}>🌶️</span>}
            label="Spicy"
            textColor={textColor}
          />
        </div>
      </div>

      {/* Bottom ornamental rule */}
      <div
        style={{
          margin: "0 2rem",
          height: "1px",
          background: `linear-gradient(90deg, transparent 0%, ${categoryHeaderColor}25 15%, ${categoryHeaderColor}70 45%, ${categoryHeaderColor}70 55%, ${categoryHeaderColor}25 85%, transparent 100%)`,
        }}
      />
    </div>
  );
}

function LegendItem({
  chip,
  label,
  textColor,
}: {
  chip: React.ReactNode;
  label: string;
  textColor: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      {chip}
      <span
        style={{
          color: `${textColor}AA`,
          fontSize: "0.65rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        = {label}
      </span>
    </span>
  );
}
