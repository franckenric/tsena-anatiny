import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { dictionaries, type Language } from "../i18n/translations";

const STORAGE_KEY = "fo.lang";

export type { Language };

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === "mg" ? "mg" : "fr";
  } catch {
    return "fr";
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // stockage indisponible: on garde en mémoire
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const pluralKey =
        vars && Number(vars.count) !== 1 ? `${key}_plural` : null;
      const dict = dictionaries[language];
      const template =
        (pluralKey ? dict[pluralKey] : undefined) ??
        dict[key] ??
        (pluralKey ? dictionaries.fr[pluralKey] : undefined) ??
        dictionaries.fr[key] ??
        key;
      if (!vars) return template;
      return template.replace(
        /\{(\w+)\}/g,
        (match, name: string) =>
          vars[name] !== undefined ? String(vars[name]) : match
      );
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n doit être utilisé dans <I18nProvider>");
  return ctx;
}
