import { Head, Html, Main, NextScript } from "next/document";

/**
 * Custom Document component for Next.js.
 * Includes a blocking script to apply cached theme colors before hydration,
 * preventing the flash of default theme colors on page load.
 */
export default function Document() {
  // Inline script to apply cached theme colors BEFORE React hydrates
  // This prevents the flash of grey/default colors
  const themeScript = `
    (function() {
      try {
        var cached = localStorage.getItem('kan-theme-cache');
        if (cached) {
          var colors = JSON.parse(cached);
          var root = document.documentElement;
          
          // Apply background colors
          if (colors.sidebar) root.style.setProperty('--kan-sidebar-bg', colors.sidebar);
          if (colors.pages) root.style.setProperty('--kan-pages-bg', colors.pages);
          if (colors.boardBackground) root.style.setProperty('--kan-board-bg', colors.boardBackground);
          if (colors.button) root.style.setProperty('--kan-button-bg', colors.button);
          if (colors.menu) root.style.setProperty('--kan-menu-bg', colors.menu);
          
          // Simple contrast calculation (same logic as getContrastColor)
          function getContrast(hex) {
            if (!hex) return '#000000';
            hex = hex.replace('#', '');
            var r = parseInt(hex.substr(0, 2), 16);
            var g = parseInt(hex.substr(2, 2), 16);
            var b = parseInt(hex.substr(4, 2), 16);
            var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return yiq >= 128 ? '#000000' : '#ffffff';
          }
          
          // Apply text colors
          if (colors.sidebar) root.style.setProperty('--kan-sidebar-text', getContrast(colors.sidebar));
          if (colors.pages) root.style.setProperty('--kan-pages-text', getContrast(colors.pages));
          if (colors.boardBackground) root.style.setProperty('--kan-board-text', getContrast(colors.boardBackground));
          if (colors.button) root.style.setProperty('--kan-button-text', getContrast(colors.button));
          if (colors.menu) root.style.setProperty('--kan-menu-text', getContrast(colors.menu));
          
          // Set background color of html immediately to match theme while invisible
          if (colors.sidebar) root.style.backgroundColor = colors.sidebar;
        }
      } catch (e) {
        // Ignore errors (e.g., no localStorage access)
      }
    })();
  `;

  return (
    <Html lang="en">
      <Head>
        {/* Blocking script to prevent theme flash */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />

        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.svg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
