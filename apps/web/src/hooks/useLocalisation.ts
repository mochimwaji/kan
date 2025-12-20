import { enGB } from "date-fns/locale";

export function useLocalisation() {
  return {
    locale: "en",
    dateLocale: enGB,
    setLocale: async (_newLocale: string) => {
      // No-op in English-only mode
    },
    availableLocales: ["en"],
    formatNumber: (n: number | string) => {
      const num = typeof n === "string" ? parseFloat(n) : n;
      return isNaN(num) ? n.toString() : num.toLocaleString("en-GB");
    },
  };
}
