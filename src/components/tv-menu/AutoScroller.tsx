import { useRef, useState, useEffect, type ReactNode } from "react";

interface Props {
  enabled: boolean;
  speed: "slow" | "medium" | "fast";
  children: ReactNode;
}

const SPEED_PX_PER_SEC: Record<string, number> = {
  slow: 30,
  medium: 60,
  fast: 100,
};

export function AutoScroller({ enabled, speed, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(0);
  const [key, setKey] = useState(0); // force animation restart

  useEffect(() => {
    if (!enabled) return;

    const measure = () => {
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;

      const diff = inner.scrollHeight - container.clientHeight;
      setOverflow(diff > 10 ? diff : 0);
      setKey((k) => k + 1);
    };

    // Measure after render and images load
    measure();
    const timeout = setTimeout(measure, 2000);

    const observer = new ResizeObserver(measure);
    if (innerRef.current) observer.observe(innerRef.current);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [enabled, children]);

  const pxPerSec = SPEED_PX_PER_SEC[speed] ?? 60;
  // Scroll phase: 80% scrolling, 10% pause at bottom, 10% snap back
  const scrollDuration = overflow / pxPerSec;
  const totalDuration = scrollDuration / 0.8;

  const animationStyle =
    enabled && overflow > 0
      ? {
          animation: `tvScroll${key} ${totalDuration}s ease-in-out infinite`,
        }
      : {};

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden relative">
      {enabled && overflow > 0 && (
        <style>{`
          @keyframes tvScroll${key} {
            0% { transform: translateY(0); }
            80% { transform: translateY(-${overflow}px); }
            90% { transform: translateY(-${overflow}px); }
            100% { transform: translateY(0); }
          }
        `}</style>
      )}
      <div ref={innerRef} style={animationStyle}>
        {children}
      </div>
    </div>
  );
}
