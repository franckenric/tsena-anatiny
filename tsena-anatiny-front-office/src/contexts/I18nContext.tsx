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

const SUPPORTED_LANGUAGES: readonly Language[] = ["fr", "en"];

function isSupported(value: string | null): value is Language {
  return value !== null && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "fr";
  const candidates = navigator.languages ?? [navigator.language];
  for (const raw of candidates) {
    if (!raw) continue;
    const base = raw.toLowerCase().split("-")[0];
    if (isSupported(base)) return base;
  }
  return "fr";
}

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Une langue stockee mais retiree (ex. "mg") retombe sur la detection.
    return isSupported(stored) ? stored : detectBrowserLanguage();
  } catch {
    return detectBrowserLanguage();
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
