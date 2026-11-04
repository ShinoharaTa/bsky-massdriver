import { afterEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { dateLocale, detectLocale, locale, t, translate, type MessageKey } from "./index";
import { ja } from "./ja";
import { en } from "./en";

function stubWindow(saved: string | null, language: string) {
  vi.stubGlobal("window", {
    localStorage: { getItem: () => saved },
    navigator: { language },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  locale.set("ja");
});

describe("detectLocale", () => {
  it("returns ja when window is undefined (SSR)", () => {
    expect(detectLocale()).toBe("ja");
  });

  it("prefers localStorage over navigator.language", () => {
    stubWindow("en", "ja-JP");
    expect(detectLocale()).toBe("en");
    stubWindow("ja", "en-US");
    expect(detectLocale()).toBe("ja");
  });

  it("ignores invalid localStorage values", () => {
    stubWindow("fr", "ja-JP");
    expect(detectLocale()).toBe("ja");
  });

  it("returns ja when navigator.language starts with ja", () => {
    stubWindow(null, "ja-JP");
    expect(detectLocale()).toBe("ja");
    stubWindow(null, "ja");
    expect(detectLocale()).toBe("ja");
  });

  it("returns en for other languages", () => {
    stubWindow(null, "en-US");
    expect(detectLocale()).toBe("en");
    stubWindow(null, "fr-FR");
    expect(detectLocale()).toBe("en");
  });

  it("falls back to navigator.language when localStorage throws", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
      navigator: { language: "en-US" },
    });
    expect(detectLocale()).toBe("en");
  });
});

describe("translate", () => {
  it("returns the message for the current locale", () => {
    locale.set("ja");
    expect(translate("common.close")).toBe(ja["common.close"]);
    locale.set("en");
    expect(translate("common.close")).toBe(en["common.close"]);
  });

  it("replaces placeholders with params", () => {
    locale.set("en");
    expect(translate("compose.postSuccess", { success: 2, total: 3 })).toBe("Posted (2/3)");
    expect(translate("notification.action.reply", { name: "alice" })).toBe("alice replied");
  });

  it("leaves placeholders without params untouched", () => {
    locale.set("en");
    expect(translate("notification.action.reply")).toBe("{name} replied");
    expect(translate("compose.postSuccess", { success: 1 })).toBe("Posted (1/{total})");
  });

  it("returns the key itself when the message is missing", () => {
    expect(translate("missing.key" as MessageKey)).toBe("missing.key");
  });
});

describe("t store", () => {
  it("follows locale changes", () => {
    locale.set("ja");
    expect(get(t)("common.close")).toBe(ja["common.close"]);
    locale.set("en");
    expect(get(t)("common.close")).toBe(en["common.close"]);
  });
});

describe("dateLocale", () => {
  it("maps locale to Intl locale", () => {
    locale.set("ja");
    expect(dateLocale()).toBe("ja-JP");
    locale.set("en");
    expect(dateLocale()).toBe("en-US");
    expect(dateLocale("ja")).toBe("ja-JP");
  });
});
