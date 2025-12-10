import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

interface CollapsibleSectionProps {
  children: ReactNode;
  isOpen: boolean;
  className?: string;
}

/**
 * A reusable collapsible container with smooth animated transitions.
 * Uses max-height and opacity for smooth collapse/expand animation.
 */
export default function CollapsibleSection({
  children,
  isOpen,
  className,
}: CollapsibleSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">(isOpen ? "auto" : 0);

  useEffect(() => {
    if (!contentRef.current) return;

    if (isOpen) {
      // Expanding: set to actual height, then transition to auto
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight);

      // After transition completes, set to auto for dynamic content
      const timer = setTimeout(() => {
        setHeight("auto");
      }, 200); // Match transition duration

      return () => clearTimeout(timer);
    } else {
      // Collapsing: set to current height first, then animate to 0
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight);

      // Force a reflow to ensure the height is set before transition
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      contentRef.current.offsetHeight;

      // Use requestAnimationFrame to ensure the browser has painted
      requestAnimationFrame(() => {
        setHeight(0);
      });
    }
  }, [isOpen]);

  return (
    <div
      ref={contentRef}
      className={twMerge(
        "overflow-hidden transition-all duration-200 ease-in-out",
        className,
      )}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        opacity: isOpen ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
}
