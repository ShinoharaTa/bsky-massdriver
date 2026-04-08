import { describe, expect, it } from "vitest";
import { extractHashtags } from "./posting";

describe("extractHashtags", () => {
  it("extracts simple hashtags", () => {
    expect(extractHashtags("Hello #world")).toEqual(["world"]);
  });

  it("extracts multiple hashtags", () => {
    expect(extractHashtags("#hello #world")).toEqual(["hello", "world"]);
  });

  it("normalizes to lowercase", () => {
    expect(extractHashtags("#Hello #WORLD")).toEqual(["hello", "world"]);
  });

  it("deduplicates hashtags", () => {
    expect(extractHashtags("#hello #Hello")).toEqual(["hello"]);
  });

  it("strips trailing punctuation", () => {
    expect(extractHashtags("#hello. #world!")).toEqual(["hello", "world"]);
  });

  it("strips trailing Japanese punctuation", () => {
    expect(extractHashtags("#テスト」 #挨拶）")).toEqual(["テスト", "挨拶"]);
  });

  it("handles hashtags with Japanese characters", () => {
    expect(extractHashtags("#日本語 #テスト")).toEqual(["日本語", "テスト"]);
  });

  it("returns empty for no hashtags", () => {
    expect(extractHashtags("Hello world")).toEqual([]);
  });

  it("returns empty for empty string", () => {
    expect(extractHashtags("")).toEqual([]);
  });

  it("ignores # followed by space", () => {
    expect(extractHashtags("# ")).toEqual([]);
  });

  it("handles hashtags at end of text", () => {
    expect(extractHashtags("post text #tag")).toEqual(["tag"]);
  });
});
