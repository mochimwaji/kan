interface TabTransitionProps {
  children: React.ReactNode;
}

/**
 * A component that provides smooth fade-in animation when mounted.
 * Since Next.js Pages Router remounts the layout on each navigation,
 * we use a CSS animation that plays on mount rather than state-based transitions.
 */
export default function TabTransition({ children }: TabTransitionProps) {
  return (
    <div className="animate-fade-in">
      {children}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fadeIn 800ms ease-in-out;
        }
      `}</style>
    </div>
  );
}
