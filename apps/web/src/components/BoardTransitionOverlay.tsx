"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import PatternedBackground from "~/components/PatternedBackground";
import {
  ANIMATION_DURATION,
  useBoardTransition,
} from "~/providers/board-transition";

interface AnimationStyles {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: number;
  opacity: number;
}

// Get the page content area bounds (main content beside sidebar)
function getContentAreaBounds(): {
  top: number;
  left: number;
  width: number;
  height: number;
} {
  // Try to find the main content container by looking for the pages background container
  const contentArea = document.querySelector('[data-content-area="true"]');
  if (contentArea) {
    const rect = contentArea.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  }

  // Fallback: estimate content area (sidebar is typically 256px or 56px when collapsed)
  const sidebar = document.querySelector("nav");
  const sidebarWidth = sidebar ? sidebar.getBoundingClientRect().width : 256;

  return {
    top: 0,
    left: sidebarWidth,
    width: window.innerWidth - sidebarWidth,
    height: window.innerHeight,
  };
}

export default function BoardTransitionOverlay() {
  const {
    sourceRect,
    boardName,
    animationPhase,
    completeExpand,
    completeContract,
  } = useBoardTransition();

  const [styles, setStyles] = useState<AnimationStyles | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle expanding animation
  useEffect(() => {
    if (animationPhase === "expanding" && sourceRect) {
      const contentBounds = getContentAreaBounds();

      // Start at source rect
      setStyles({
        top: sourceRect.top,
        left: sourceRect.left,
        width: sourceRect.width,
        height: sourceRect.height,
        borderRadius: 8,
        opacity: 1,
      });

      // Animate to content area after a frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setStyles({
            top: contentBounds.top,
            left: contentBounds.left,
            width: contentBounds.width,
            height: contentBounds.height,
            borderRadius: 0,
            opacity: 1,
          });
        });
      });

      // Complete expand after animation
      const timer = setTimeout(() => {
        completeExpand();
        setStyles(null);
      }, ANIMATION_DURATION);

      return () => clearTimeout(timer);
    }
  }, [animationPhase, sourceRect, completeExpand]);

  // Handle contracting animation
  useEffect(() => {
    if (animationPhase === "contracting" && sourceRect) {
      const contentBounds = getContentAreaBounds();

      // Start at content area
      setStyles({
        top: contentBounds.top,
        left: contentBounds.left,
        width: contentBounds.width,
        height: contentBounds.height,
        borderRadius: 0,
        opacity: 1,
      });

      // Animate to source rect after a frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setStyles({
            top: sourceRect.top,
            left: sourceRect.left,
            width: sourceRect.width,
            height: sourceRect.height,
            borderRadius: 8,
            opacity: 1,
          });
        });
      });

      // Complete contract after animation
      const timer = setTimeout(() => {
        completeContract();
        setStyles(null);
      }, ANIMATION_DURATION);

      return () => clearTimeout(timer);
    }
  }, [animationPhase, sourceRect, completeContract]);

  // Don't render if not animating or not mounted
  if (
    !mounted ||
    !styles ||
    animationPhase === "idle" ||
    animationPhase === "expanded"
  ) {
    return null;
  }

  const overlayContent = (
    <div
      className="fixed z-[100] overflow-hidden border border-dashed border-light-400 shadow-lg"
      style={{
        top: styles.top,
        left: styles.left,
        width: styles.width,
        height: styles.height,
        borderRadius: styles.borderRadius,
        opacity: styles.opacity,
        backgroundColor: "var(--kan-board-bg)",
        transition: `all ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        pointerEvents: "none",
      }}
    >
      <PatternedBackground />
      <div className="absolute inset-0 flex items-center justify-center">
        <p
          className="text-[14px] font-bold"
          style={{
            color: "var(--kan-board-text)",
            opacity: animationPhase === "expanding" ? 1 : 0,
            transition: `opacity ${ANIMATION_DURATION / 2}ms ease`,
          }}
        >
          {boardName}
        </p>
      </div>
    </div>
  );

  return createPortal(overlayContent, document.body);
}
