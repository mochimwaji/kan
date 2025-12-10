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
 * Uses a two-phase animation: height changes first, then content fades in/out.
 * This prevents the "jerky" feeling of simultaneous height+opacity changes.
 */
export default function CollapsibleSection({
  children,
  isOpen,
  className,
}: CollapsibleSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">(isOpen ? "auto" : 0);
  const [contentOpacity, setContentOpacity] = useState(isOpen ? 1 : 0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!innerRef.current) return;

    if (isOpen) {
      // EXPANDING: First set height, then fade in content
      setIsAnimating(true);

      // Step 1: Animate height from 0 to actual content height
      const contentHeight = innerRef.current.scrollHeight;
      setHeight(contentHeight);

      // Step 2: After height animation completes, fade in content and set height to auto
      const heightTimer = setTimeout(() => {
        setContentOpacity(1);
        setHeight("auto");
        setIsAnimating(false);
      }, 200); // Match height transition duration

      return () => clearTimeout(heightTimer);
    } else {
      // COLLAPSING: First fade out content, then collapse height
      setIsAnimating(true);

      // Step 1: Fade out content immediately
      setContentOpacity(0);

      // Step 2: Set height to current value (from auto) to enable transition
      if (innerRef.current) {
        const currentHeight = innerRef.current.scrollHeight;
        setHeight(currentHeight);
      }

      // Step 3: After a brief delay to set the explicit height, animate to 0
      const setupTimer = requestAnimationFrame(() => {
        // Force a reflow to ensure height is set before animating
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        contentRef.current?.offsetHeight;

        requestAnimationFrame(() => {
          setHeight(0);
        });
      });

      // Mark animation complete after full sequence
      const completeTimer = setTimeout(() => {
        setIsAnimating(false);
      }, 350); // height transition + buffer

      return () => {
        cancelAnimationFrame(setupTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isOpen]);

  return (
    <div
      ref={contentRef}
      className={twMerge(
        "overflow-hidden transition-[height] duration-200 ease-in-out",
        className,
      )}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
      }}
    >
      <div
        ref={innerRef}
        className="transition-opacity duration-150 ease-in-out"
        style={{
          opacity: contentOpacity,
        }}
      >
        {children}
      </div>
    </div>
  );
}
