import { describe, expect, it } from "vitest";
import {
  normalizeNotificationReason,
  sortTimelineDesc,
  createCursorMap,
  chunkItems,
} from "./bsky";

describe("normalizeNotificationReason", () => {
  it.each(["reply", "mention", "repost", "like", "quote", "follow"] as const)(
    "returns '%s' as-is",
    (reason) => {
      expect(normalizeNotificationReason(reason)).toBe(reason);
    },
  );

  it("returns 'unknown' for unrecognised strings", () => {
    expect(normalizeNotificationReason("starterpack-joined")).toBe("unknown");
  });

  it("returns 'unknown' for non-string values", () => {
    expect(normalizeNotificationReason(42)).toBe("unknown");
    expect(normalizeNotificationReason(null)).toBe("unknown");
    expect(normalizeNotificationReason(undefined)).toBe("unknown");
  });
});

describe("sortTimelineDesc", () => {
  it("sorts items by indexedAt descending", () => {
    const items = [
      { indexedAt: "2024-01-01T00:00:00Z", id: "old" },
      { indexedAt: "2024-06-15T12:00:00Z", id: "mid" },
      { indexedAt: "2025-01-01T00:00:00Z", id: "new" },
    ];
    const sorted = sortTimelineDesc(items);
    expect(sorted.map((i) => i.id)).toEqual(["new", "mid", "old"]);
  });

  it("returns empty array for empty input", () => {
    expect(sortTimelineDesc([])).toEqual([]);
  });

  it("does not mutate original array", () => {
    const items = [
      { indexedAt: "2024-01-01T00:00:00Z" },
      { indexedAt: "2025-01-01T00:00:00Z" },
    ];
    const original = [...items];
    sortTimelineDesc(items);
    expect(items).toEqual(original);
  });
});

describe("createCursorMap", () => {
  it("maps account IDs to null by default", () => {
    expect(createCursorMap(["a", "b"])).toEqual({ a: null, b: null });
  });

  it("preserves existing cursors", () => {
    expect(createCursorMap(["a", "b"], { a: "cursor-a" })).toEqual({
      a: "cursor-a",
      b: null,
    });
  });

  it("returns empty object for empty input", () => {
    expect(createCursorMap([])).toEqual({});
  });
});

describe("chunkItems", () => {
  it("splits items into equal-sized chunks", () => {
    expect(chunkItems([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("handles remainder chunk", () => {
    expect(chunkItems([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns single chunk when size >= length", () => {
    expect(chunkItems([1, 2], 10)).toEqual([[1, 2]]);
  });

  it("returns empty array for empty input", () => {
    expect(chunkItems([], 5)).toEqual([]);
  });
});
