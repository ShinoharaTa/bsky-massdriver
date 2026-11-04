import { derived, get, writable } from "svelte/store";
import { ja } from "./ja";
import { en } from "./en";

export type Locale = "ja" | "en";
export type MessageKey = keyof typeof ja;
export type MessageParams = Record<string, string | number>;

const LOCALE_STORAGE_KEY = "locale";

const messages: Record<Locale, Record<MessageKey, string>> = { ja, en };

export const locales: readonly Locale[] = ["ja", "en"];

// 切替 UI 用。表示中の言語に関係なく、各言語を自言語の名前で出す
export const localeNames: Record<Locale, string> = {
  ja: ja["locale.name"],
  en: en["locale.name"],
};

function isLocale(value: unknown): value is Locale {
  return value === "ja" || value === "en";
}

// 判定順: localStorage["locale"] → navigator.language（ja* なら ja、それ以外は en）。SSR / prerender 時は ja
export function detectLocale(): Locale {
  if (typeof window === "undefined") return "ja";
  try {
    const saved = window.localStorage?.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // localStorage が使えない環境では navigator にフォールバック
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
    // 保存できなくても表示の切替は行う
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

// store 外（lib/script/*.ts など）から呼ぶ同期版
export function translate(key: MessageKey, params?: MessageParams): string {
  return format(get(locale), key, params);
}

// Intl.DateTimeFormat 用。引数を省略すると現在の locale を使う
export function dateLocale(l: Locale = get(locale)): string {
  return l === "ja" ? "ja-JP" : "en-US";
}
