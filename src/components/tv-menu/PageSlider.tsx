import { useState, useEffect, useRef, type ReactNode } from "react";

interface Props {
  duration: number; // seconds per page
  children: ReactNode;
}

export function PageSlider({ duration, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Measure content and calculate pages
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

  // Auto-advance pages
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
          transitionDuration: "800ms",
        }}
      >
        {children}
      </div>

      {/* Page indicator dots */}
      {totalPages > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === currentPage ? 24 : 8,
                height: 8,
                backgroundColor: i === currentPage
                  ? "rgba(255,255,255,0.8)"
                  : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
