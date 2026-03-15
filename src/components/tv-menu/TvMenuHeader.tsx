import { useEffect, useState } from "react";

interface Props {
  text: string;
  accentColor: string;
  textColor: string;
}

export function TvMenuHeader({ text, accentColor, textColor }: Props) {
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
    <div
      className="flex items-center justify-between px-8 py-4 shrink-0"
      style={{ borderBottom: `2px solid ${accentColor}22` }}
    >
      <h1
        className="text-3xl font-serif font-bold"
        style={{ color: accentColor }}
      >
        {text || "Our Menu"}
      </h1>
      <span
        className="text-xl font-mono opacity-70"
        style={{ color: textColor }}
      >
        {formattedTime}
      </span>
    </div>
  );
}
