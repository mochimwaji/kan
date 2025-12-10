interface TabTransitionProps {
  children: React.ReactNode;
}

/**
 * A component that provides smooth fade-in animation when mounted.
 * Uses Tailwind's animate-fade-in class for consistency with the rest of the app.
 * Since Next.js Pages Router remounts the layout on each navigation,
 * we use a CSS animation that plays on mount rather than state-based transitions.
 */
export default function TabTransition({ children }: TabTransitionProps) {
  return <div className="animate-fade-in">{children}</div>;
}
