import { useState, useEffect, useRef, type ReactNode } from "react";

interface Props {
  duration: number; // seconds per page
  accentColor: string;
  children: ReactNode;
}

export function PageSlider({ duration, accentColor, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      const ch = container.clientHeight;
      const sh = content.scrollHeight;
      setContainerHeight(ch);

      if (sh <= ch) {
        setTotalPages(1);
        setCurrentPage(0);
      } else {
        setTotalPages(Math.ceil(sh / ch));
      }
    };

    measure();
    const timeout = setTimeout(measure, 1000);

    const observer = new ResizeObserver(measure);
    if (contentRef.current) observer.observe(contentRef.current);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, [children]);

  useEffect(() => {
    if (totalPages <= 1) return;

    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, duration * 1000);

    return () => clearInterval(interval);
  }, [totalPages, duration]);

  const translateY = -(currentPage * containerHeight);

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden relative">
      <div
        ref={contentRef}
        className="transition-transform ease-in-out"
        style={{
          transform: `translateY(${translateY}px)`,
          transitionDuration: "900ms",
        }}
      >
        {children}
      </div>

      {/* Page indicator — segmented accent bar at the very bottom */}
      {totalPages > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "2rem",
            right: "2rem",
            height: "3px",
            display: "flex",
            gap: "3px",
          }}
        >
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: "100%",
                borderRadius: "1.5px",
                backgroundColor: accentColor,
                opacity: i === currentPage ? 0.9 : 0.18,
                transition: "opacity 0.5s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
