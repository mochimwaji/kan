import { useLingui } from "@lingui/react";

import type { Locale } from "~/locales";
import { useLinguiContext } from "~/providers/lingui";
import { activateLocale } from "~/utils/i18n";

export function useLocalisation() {
  const { i18n } = useLingui();
  const { locale, setLocale, availableLocales } = useLinguiContext();

  const handleSetLocale = async (newLocale: Locale) => {
    await activateLocale(newLocale);
    setLocale(newLocale);
  };

  return {
    locale,
    setLocale: handleSetLocale,
    availableLocales,
    formatDate: i18n.date,
    formatNumber: i18n.number,
  };
}
