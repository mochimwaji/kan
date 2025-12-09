import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Extracts the base path segment (first two segments) for comparison.
 * This ensures sub-routes like /settings/account and /settings/workspace
 * are considered the same "page" and don't trigger transitions.
 */
function getBasePath(path: string): string {
  // Remove query string and hash
  const cleanPath = path.split("?")[0]?.split("#")[0] ?? path;
  const segments = cleanPath.split("/").filter(Boolean);
  
  // For settings pages, treat all /settings/* as the same base path
  if (segments[0] === "settings") {
    return "/settings";
  }
  
  // For other pages, use the first segment as the base
  return "/" + (segments[0] ?? "");
}

/**
 * A component that provides smooth fade transitions when navigating between pages.
 * Uses CSS animations triggered by route changes.
 * Does NOT transition between sub-routes (e.g., settings tabs).
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);
  const previousBasePath = useRef(getBasePath(router.asPath));

  useEffect(() => {
    const currentBasePath = getBasePath(router.asPath);
    
    // Only trigger transition if the BASE route changed (not sub-routes)
    if (currentBasePath !== previousBasePath.current) {
      previousBasePath.current = currentBasePath;
      
      // Fade out, then swap content and fade in
      setIsVisible(false);
      
      const timeout = setTimeout(() => {
        setDisplayChildren(children);
        setIsVisible(true);
      }, 200); // Match the CSS duration

      return () => clearTimeout(timeout);
    } else {
      // Same base route (or sub-route change), just update children directly
      setDisplayChildren(children);
    }
  }, [router.asPath, children]);

  return (
    <div
      className={`h-full w-full transition-opacity duration-200 ease-in-out ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {displayChildren}
    </div>
  );
}
