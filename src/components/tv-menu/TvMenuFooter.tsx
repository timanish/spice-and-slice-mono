interface Props {
  text: string;
  textColor: string;
  accentColor: string;
}

export function TvMenuFooter({ text, textColor, accentColor }: Props) {
  if (!text) return null;

  return (
    <div className="shrink-0 relative">
      {/* Top decorative double-line (mirrors header) */}
      <div className="mx-8 flex flex-col gap-px">
        <div
          className="h-px"
          style={{
            background: `linear-gradient(90deg, transparent 15%, ${accentColor}25 35%, ${accentColor}40 50%, ${accentColor}25 65%, transparent 85%)`,
          }}
        />
        <div
          className="h-px"
          style={{
            background: `linear-gradient(90deg, transparent 5%, ${accentColor}50 30%, ${accentColor}80 50%, ${accentColor}50 70%, transparent 95%)`,
          }}
        />
      </div>

      <div
        className="px-10 py-4 text-center tracking-widest uppercase"
        style={{
          color: `${textColor}80`,
          fontSize: "0.8rem",
          letterSpacing: "0.15em",
          textShadow: `0 0 30px ${accentColor}15`,
        }}
      >
        {text}
      </div>
    </div>
  );
}
