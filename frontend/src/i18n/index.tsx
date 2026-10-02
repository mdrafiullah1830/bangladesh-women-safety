import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { extra } from "./extra";
import { strings, type Lang } from "./strings";

const LANG_KEY = "lang";

/** Merged lookup tables: `en` is the fallback for any key missing in the active language. */
const TABLES: Record<Lang, Record<string, string>> = {
  bn: { ...strings.en, ...strings.bn, ...extra.en, ...extra.bn },
  en: { ...strings.en, ...extra.en },
};

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function readLang(): Lang {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(LANG_KEY) : null;
  return stored === "en" ? "en" : "bn";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(LANG_KEY, next);
    document.documentElement.lang = next;
    setLangState(next);
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "bn" ? "en" : "bn");
  }, [lang, setLang]);

  const t = useCallback((key: string) => TABLES[lang][key] ?? key, [lang]);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, toggle, t }),
    [lang, setLang, toggle, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

export type { Lang };