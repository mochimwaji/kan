"use client";

import { useRouter } from "next/router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface BoardTransitionRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface BoardTransitionState {
  sourceRect: BoardTransitionRect | null;
  boardId: string | null;
  boardName: string | null;
  animationPhase: "idle" | "expanding" | "expanded" | "contracting";
  fromBoardsPage: boolean;
}

interface BoardTransitionContextValue extends BoardTransitionState {
  startTransition: (
    rect: BoardTransitionRect,
    boardId: string,
    boardName: string,
  ) => void;
  completeExpand: () => void;
  startContract: (targetRect: BoardTransitionRect) => void;
  completeContract: () => void;
  reset: () => void;
}

const BoardTransitionContext =
  createContext<BoardTransitionContextValue | null>(null);

const ANIMATION_DURATION = 350; // ms

export function BoardTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<BoardTransitionState>({
    sourceRect: null,
    boardId: null,
    boardName: null,
    animationPhase: "idle",
    fromBoardsPage: false,
  });

  const startTransition = useCallback(
    (rect: BoardTransitionRect, boardId: string, boardName: string) => {
      setState({
        sourceRect: rect,
        boardId,
        boardName,
        animationPhase: "expanding",
        fromBoardsPage: true,
      });
    },
    [],
  );

  const completeExpand = useCallback(() => {
    setState((prev) => ({
      ...prev,
      animationPhase: "expanded",
    }));
  }, []);

  const startContract = useCallback((targetRect: BoardTransitionRect) => {
    setState((prev) => ({
      ...prev,
      sourceRect: targetRect,
      animationPhase: "contracting",
    }));
  }, []);

  const completeContract = useCallback(() => {
    setState({
      sourceRect: null,
      boardId: null,
      boardName: null,
      animationPhase: "idle",
      fromBoardsPage: false,
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      sourceRect: null,
      boardId: null,
      boardName: null,
      animationPhase: "idle",
      fromBoardsPage: false,
    });
  }, []);

  // Listen for route changes to handle back navigation
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Check if navigating back to boards page
      const isBoardsPage = url === "/boards" || url.endsWith("/boards");
      if (
        isBoardsPage &&
        state.animationPhase === "expanded" &&
        state.sourceRect
      ) {
        // Trigger contract animation immediately to prevent flash
        startContract(state.sourceRect);
      } else if (!url.includes("/boards/") && state.animationPhase !== "idle") {
        // Navigating elsewhere, reset
        reset();
      }
    };

    router.events.on("routeChangeStart", handleRouteChange);
    return () => {
      router.events.off("routeChangeStart", handleRouteChange);
    };
  }, [router.events, state.animationPhase, state.boardId, reset]);

  return (
    <BoardTransitionContext.Provider
      value={{
        ...state,
        startTransition,
        completeExpand,
        startContract,
        completeContract,
        reset,
      }}
    >
      {children}
    </BoardTransitionContext.Provider>
  );
}

export function useBoardTransition() {
  const context = useContext(BoardTransitionContext);
  if (!context) {
    throw new Error(
      "useBoardTransition must be used within BoardTransitionProvider",
    );
  }
  return context;
}

export { ANIMATION_DURATION };
