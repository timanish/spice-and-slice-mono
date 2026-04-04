interface Props {
  text: string;
  textColor: string;
  accentColor: string;
}

export function TvMenuFooter({ text, textColor, accentColor }: Props) {
  if (!text) return null;

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
