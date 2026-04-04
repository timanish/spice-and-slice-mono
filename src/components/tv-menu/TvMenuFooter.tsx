interface Props {
  text: string;
  textColor: string;
  accentColor: string;
}

export function TvMenuFooter({ text, textColor, accentColor }: Props) {
  if (!text) return null;

  return (
    <div className="shrink-0 relative">
      {/* Top separator */}
      <div className="mx-6">
        <div
          className="h-px"
          style={{
            background: `linear-gradient(90deg, transparent 10%, ${accentColor}14 30%, ${accentColor}35 50%, ${accentColor}14 70%, transparent 90%)`,
          }}
        />
        <div
          className="h-px mt-px"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${accentColor}30 15%, ${accentColor}70 40%, ${accentColor}90 50%, ${accentColor}70 60%, ${accentColor}30 85%, transparent 100%)`,
          }}
        />
      </div>

      <div
        className="px-10 py-3 text-center tracking-widest uppercase"
        style={{
          color: `${textColor}55`,
          fontSize: "0.72rem",
          letterSpacing: "0.2em",
        }}
      >
        {text}
      </div>
    </div>
  );
}
