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
          
          // Mark as ready since we applied cached theme
          document.body.classList.add('theme-ready');
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
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
