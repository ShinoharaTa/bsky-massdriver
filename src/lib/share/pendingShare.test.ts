import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearPendingShare,
  composeShareText,
  loadPendingShare,
  savePendingShare,
} from "./pendingShare";

function makeFile(name: string) {
  return new File([`content-${name}`], name, { type: "image/jpeg" });
}

afterEach(async () => {
  await clearPendingShare();
});

describe("pendingShare", () => {
  it("returns null when nothing is saved", async () => {
    expect(await loadPendingShare()).toBeNull();
  });

  it("saves and loads text and files", async () => {
    await savePendingShare({ text: "hello", files: [makeFile("a.jpg")] });
    const loaded = await loadPendingShare();
    expect(loaded?.text).toBe("hello");
    expect(loaded?.files).toHaveLength(1);
    expect(loaded?.files[0].name).toBe("a.jpg");
    expect(loaded?.files[0].type).toBe("image/jpeg");
    expect(await loaded?.files[0].text()).toBe("content-a.jpg");
  });

  it("overwrites the previous share", async () => {
    await savePendingShare({ text: "first", files: [makeFile("a.jpg")] });
    await savePendingShare({ text: "second", files: [] });
    const loaded = await loadPendingShare();
    expect(loaded).toEqual({ text: "second", files: [] });
  });

  it("clears the saved share", async () => {
    await savePendingShare({ text: "hello", files: [] });
    await clearPendingShare();
    expect(await loadPendingShare()).toBeNull();
  });

  it("keeps all files", async () => {
    const files = ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"].map(makeFile);
    await savePendingShare({ text: "", files });
    const loaded = await loadPendingShare();
    expect(loaded?.files.map((file) => file.name)).toEqual(["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"]);
  });
});

describe("composeShareText", () => {
  it("joins title, text and url", () => {
    expect(composeShareText("Title", "Body", "https://example.com")).toBe(
      "Title\nBody\nhttps://example.com"
    );
  });

  it("skips url already included in text", () => {
    expect(composeShareText("", "Read https://example.com", "https://example.com")).toBe(
      "Read https://example.com"
    );
  });
});
