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
        className="h-px mx-10"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)`,
        }}
      />
      <div
        className="px-10 py-3 text-center text-sm tracking-wide opacity-60"
        style={{ color: textColor }}
      >
        {text}
      </div>
    </div>
  );
}
