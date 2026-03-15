interface Props {
  text: string;
  textColor: string;
  accentColor: string;
}

export function TvMenuFooter({ text, textColor, accentColor }: Props) {
  if (!text) return null;

  return (
    <div
      className="px-8 py-3 text-center text-sm opacity-70 shrink-0"
      style={{ color: textColor, borderTop: `2px solid ${accentColor}22` }}
    >
      {text}
    </div>
  );
}
