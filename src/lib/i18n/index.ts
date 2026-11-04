import { derived, get, writable } from "svelte/store";
import { ja } from "./ja";
import { en } from "./en";

export type Locale = "ja" | "en";
export type MessageKey = keyof typeof ja;
export type MessageParams = Record<string, string | number>;

const LOCALE_STORAGE_KEY = "locale";

const messages: Record<Locale, Record<MessageKey, string>> = { ja, en };

export const locales: readonly Locale[] = ["ja", "en"];

// For the switcher UI: each locale is shown by its own name, regardless of the current locale
export const localeNames: Record<Locale, string> = {
  ja: ja["locale.name"],
  en: en["locale.name"],
};

function isLocale(value: unknown): value is Locale {
  return value === "ja" || value === "en";
}

// Order: localStorage["locale"] -> navigator.language (ja* -> ja, otherwise en). "ja" during SSR / prerender
export function detectLocale(): Locale {
  if (typeof window === "undefined") return "ja";
  try {
    const saved = window.localStorage?.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // Fall back to navigator when localStorage is unavailable
  }
  const language = window.navigator?.language ?? "";
  return language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export const locale = writable<Locale>(detectLocale());

if (typeof document !== "undefined") {
  locale.subscribe((value) => {
    document.documentElement.lang = value;
  });
}

export function setLocale(value: Locale) {
  locale.set(value);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, value);
  } catch {
    // Still switch the display even if saving fails
  }
  document.documentElement.lang = value;
}

function format(l: Locale, key: MessageKey, params?: MessageParams): string {
  const template = messages[l][key];
  if (template === undefined) return key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}

export const t = derived(
  locale,
  ($l) => (key: MessageKey, params?: MessageParams) => format($l, key, params)
);

// Synchronous version for use outside components (e.g. lib/script/*.ts)
export function translate(key: MessageKey, params?: MessageParams): string {
  return format(get(locale), key, params);
}

// For Intl.DateTimeFormat. Uses the current locale when omitted
export function dateLocale(l: Locale = get(locale)): string {
  return l === "ja" ? "ja-JP" : "en-US";
}
