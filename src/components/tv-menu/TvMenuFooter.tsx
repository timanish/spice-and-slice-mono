interface Props {
  text: string;
  textColor: string;
  accentColor: string;
  variant?: "default" | "restaurant";
  categoryHeaderColor?: string;
}

export function TvMenuFooter({
  text,
  textColor,
  accentColor,
  variant = "default",
  categoryHeaderColor,
}: Props) {
  if (!text) return null;

  if (variant === "restaurant") {
    const gold = categoryHeaderColor ?? accentColor;
    return (
      <div className="shrink-0" style={{ paddingBottom: "0.65rem", paddingTop: "0.4rem" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.85rem",
              padding: "0.4rem 1.4rem",
              border: `1px solid ${gold}55`,
              borderRadius: "9999px",
              background: "rgba(0,0,0,0.3)",
            }}
          >
            <span style={{ color: `${gold}AA`, fontSize: "0.85rem", lineHeight: 1 }}>❦</span>
            <span
              className="font-serif"
              style={{
                color: `${textColor}DD`,
                fontSize: "0.78rem",
                letterSpacing: "0.12em",
                fontStyle: "italic",
              }}
            >
              {text}
            </span>
            <span style={{ color: `${gold}AA`, fontSize: "0.85rem", lineHeight: 1 }}>❦</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0">
      <div
        style={{
          margin: "0 2rem",
          height: "1px",
          background: `linear-gradient(90deg, transparent 0%, ${accentColor}25 15%, ${accentColor}70 45%, ${accentColor}70 55%, ${accentColor}25 85%, transparent 100%)`,
        }}
      />
      <p
        style={{
          padding: "0.6rem 2.5rem",
          textAlign: "center",
          color: `${textColor}40`,
          fontSize: "0.7rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}
      >
        {text}
      </p>
    </div>
  );
}
