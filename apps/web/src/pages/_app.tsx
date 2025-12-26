import "~/styles/globals.css";

import type { NextPage, Viewport } from "next";
import type { AppProps, AppType } from "next/app";
import type { ReactElement, ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

import { BoardTransitionProvider } from "~/providers/board-transition";
import { KeyboardShortcutProvider } from "~/providers/keyboard-shortcuts";
import { ModalProvider } from "~/providers/modal";
import { PopupProvider } from "~/providers/popup";
import { api } from "~/utils/api";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Kan",
  description: "Open source Kanban board for teams",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // For notched devices in PWA mode
};

export type NextPageWithLayout<P = Record<string, never>, IP = P> = NextPage<
  P,
  IP
> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

const MyApp: AppType = ({ Component, pageProps }: AppPropsWithLayout) => {
  const getLayout = Component.getLayout ?? ((page) => page);

  // Register service worker for PWA
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    }
  }, []);

  return (
    <>
      <style jsx global>{`
        html {
          font-family: ${jakarta.style.fontFamily};
        }
        body {
          position: relative;
        }
      `}</style>
      {/* eslint-disable-next-line @next/next/no-sync-scripts -- Intentional for runtime env vars */}
      <script src="/__ENV.js" />
      <main className="font-sans">
        <KeyboardShortcutProvider>
          <BoardTransitionProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              forcedTheme="light"
              enableSystem={false}
            >
              <ModalProvider>
                <PopupProvider>
                  {getLayout(<Component {...pageProps} />)}
                </PopupProvider>
              </ModalProvider>
            </ThemeProvider>
          </BoardTransitionProvider>
        </KeyboardShortcutProvider>
      </main>
    </>
  );
};

export default api.withTRPC(MyApp);
