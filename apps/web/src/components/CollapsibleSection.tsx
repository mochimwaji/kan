import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

interface CollapsibleSectionProps {
  children: ReactNode;
  isOpen: boolean;
  className?: string;
  /** Skip animation and render instantly in the target state (useful for hydration) */
  skipAnimation?: boolean;
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
  skipAnimation = false,
}: CollapsibleSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">(isOpen ? "auto" : 0);
  const [contentOpacity, setContentOpacity] = useState(isOpen ? 1 : 0);
  // Track if we've done the initial render to skip animation on first paint
  const hasRenderedRef = useRef(false);

  useEffect(() => {
    // On first effect run, just sync state without animation if skipAnimation is true
    if (!hasRenderedRef.current) {
      hasRenderedRef.current = true;
      if (skipAnimation) {
        setHeight(isOpen ? "auto" : 0);
        setContentOpacity(isOpen ? 1 : 0);
        return;
      }
    }
    if (!innerRef.current) return;

    if (isOpen) {
      // EXPANDING: First set height, then fade in content

      // Step 1: Animate height from 0 to actual content height
      const contentHeight = innerRef.current.scrollHeight;
      setHeight(contentHeight);

      // Step 2: After height animation completes, fade in content and set height to auto
      const heightTimer = setTimeout(() => {
        setContentOpacity(1);
        setHeight("auto");
      }, 200); // Match height transition duration

      return () => clearTimeout(heightTimer);
    } else {
      // COLLAPSING: First fade out content, then collapse height

      // Step 1: Fade out content immediately
      setContentOpacity(0);

      // Step 2: Set height to current value (from auto) to enable transition
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime safety check
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

      return () => {
        cancelAnimationFrame(setupTimer);
      };
    }
  }, [isOpen, skipAnimation]);

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
